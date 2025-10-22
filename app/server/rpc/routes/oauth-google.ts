import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import {
  createGoogleAuthorizationURL,
  createGoogleOAuthClient,
  generateOAuthCodeVerifier,
  generateOAuthState,
  getGoogleUser,
  validateGoogleAuthorizationCode,
} from "~/features/auth/oauth/google";
import { oauthStates, passkeys, users } from "~/features/auth/schema";
import { createAuthService } from "~/features/auth/service";
import { setCookie } from "~/shared/utils/cookies";
import type { Env } from "~/types/cloudflare";

/**
 * Google OAuth関連のAPIルート
 */
export const googleOAuthRoutes = new Hono<{ Bindings: Env }>()
  /**
   * GET /rpc/oauth/google/authorize
   * Google OAuth認証フローを開始
   */
  .get("/authorize", async (c) => {
    try {
      const db = drizzle(c.env.DB);
      const origin = new URL(c.req.raw.url).origin;

      // OAuth credentials取得
      const clientId = c.env.GOOGLE_CLIENT_ID;
      const clientSecret = c.env.GOOGLE_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return c.json(
          { error: "Google OAuth credentials are not configured" },
          500,
        );
      }

      const redirectUri = `${origin}/rpc/oauth/google/callback`;
      const google = createGoogleOAuthClient(
        clientId,
        clientSecret,
        redirectUri,
      );

      // state と codeVerifier を生成
      const state = generateOAuthState();
      const codeVerifier = generateOAuthCodeVerifier();

      // state をデータベースに保存（10分で期限切れ）
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      await db.insert(oauthStates).values({
        state,
        codeVerifier,
        provider: "google",
        expiresAt,
      });

      // Google認証URLを生成
      const authUrl = createGoogleAuthorizationURL(google, state, codeVerifier);

      // Googleの認証ページにリダイレクト
      return c.redirect(authUrl.toString());
    } catch (error) {
      console.error("OAuth authorization error:", error);
      return c.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to start OAuth flow",
        },
        500,
      );
    }
  })
  /**
   * GET /rpc/oauth/google/callback
   * Googleからのコールバックを処理
   */
  .get("/callback", async (c) => {
    try {
      const db = drizzle(c.env.DB);
      const origin = new URL(c.req.raw.url).origin;

      // クエリパラメータから code と state を取得
      const code = c.req.query("code");
      const state = c.req.query("state");
      const error = c.req.query("error");

      // ユーザーが認証をキャンセルした場合
      if (error === "access_denied") {
        return c.redirect("/auth?error=google_auth_cancelled");
      }

      if (!code || !state) {
        return c.redirect("/auth?error=invalid_oauth_callback");
      }

      // stateをデータベースから取得
      const savedState = await db
        .select()
        .from(oauthStates)
        .where(eq(oauthStates.state, state))
        .get();

      if (!savedState) {
        return c.redirect("/auth?error=invalid_state");
      }

      // stateの有効期限チェック
      if (new Date(savedState.expiresAt) < new Date()) {
        await db.delete(oauthStates).where(eq(oauthStates.state, state));
        return c.redirect("/auth?error=expired_state");
      }

      // OAuth credentials取得
      const clientId = c.env.GOOGLE_CLIENT_ID;
      const clientSecret = c.env.GOOGLE_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return c.json(
          { error: "Google OAuth credentials are not configured" },
          500,
        );
      }

      const redirectUri = `${origin}/rpc/oauth/google/callback`;
      const google = createGoogleOAuthClient(
        clientId,
        clientSecret,
        redirectUri,
      );

      // 認証コードを検証してトークンを取得
      const tokens = await validateGoogleAuthorizationCode(
        google,
        code,
        savedState.codeVerifier,
      );

      // stateを削除（使い捨て）
      await db.delete(oauthStates).where(eq(oauthStates.state, state));

      // Googleユーザー情報を取得
      const googleUser = await getGoogleUser(tokens.accessToken());

      // メールアドレスでユーザーを検索
      let user = await db
        .select()
        .from(users)
        .where(eq(users.email, googleUser.email))
        .get();

      if (user) {
        // 既存ユーザー: googleIdを更新（まだ設定されていない場合）
        if (!user.googleId) {
          await db
            .update(users)
            .set({
              googleId: googleUser.id,
              emailVerified: true, // Googleで認証済み
            })
            .where(eq(users.id, user.id));
          user.googleId = googleUser.id;
          user.emailVerified = true;
        }
      } else {
        // 新規ユーザー: 作成
        const [newUser] = await db
          .insert(users)
          .values({
            email: googleUser.email,
            googleId: googleUser.id,
            provider: "google",
            emailVerified: true, // Googleで認証済み
          })
          .returning();

        user = newUser;
      }

      if (!user) {
        return c.redirect("/auth?error=failed_to_create_user");
      }

      // セッション作成
      const auth = createAuthService({
        cloudflare: { env: c.env, ctx: c.executionCtx },
      });
      const token = await auth.createSession({
        id: user.id,
        email: user.email,
        emailVerified: !!user.emailVerified,
      });

      // Cookie設定してホームにリダイレクト
      const authCookie = setCookie("auth_token", token);

      // パスキーの有無をチェック
      const userPasskey = await db
        .select()
        .from(passkeys)
        .where(eq(passkeys.userId, user.id))
        .limit(1)
        .get();

      // パスキーがない場合は登録を促すクエリパラメータ付きでリダイレクト
      // ログイン成功フラグも追加
      const redirectUrl = userPasskey
        ? "/?login_success=1"
        : "/?prompt_passkey=true&login_success=1";

      // Cookieを設定してリダイレクト
      const response = new Response(null, {
        status: 302,
        headers: {
          Location: redirectUrl,
          "Set-Cookie": authCookie,
        },
      });

      return response;
    } catch (error) {
      console.error("OAuth callback error:", error);
      return c.redirect("/auth?error=oauth_callback_failed");
    }
  });

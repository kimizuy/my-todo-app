import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import {
  createAuthService,
  requireAuth,
} from "~/features/auth/lib/auth-service";
import {
  generatePasskeyAuthenticationOptions,
  generatePasskeyRegistrationOptions,
  verifyPasskeyAuthentication,
  verifyPasskeyRegistration,
} from "~/features/auth/lib/webauthn";
import { passkeys, users } from "~/features/auth/schema";
import { setCookie } from "~/shared/utils/cookies";
import type { Env } from "~/types/cloudflare";

/**
 * パスキー関連のAPIルート
 */
export const passkeyRoutes = new Hono<{ Bindings: Env }>()
  /**
   * GET /rpc/passkey/register-options
   * パスキー登録オプションを生成
   */
  .get("/register-options", async (c) => {
    try {
      // ユーザー認証を確認
      const request = c.req.raw;
      const user = await requireAuth(request, {
        cloudflare: { env: c.env, ctx: c.executionCtx },
      });

      const db = drizzle(c.env.DB);

      // リクエストのoriginを取得
      const origin = new URL(request.url).origin;

      // パスキー登録オプションを生成
      const options = await generatePasskeyRegistrationOptions(
        user.id,
        user.email,
        origin,
        db,
      );

      return c.json(options);
    } catch (error) {
      return c.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "パスキー登録オプションの生成に失敗しました",
        },
        500,
      );
    }
  })
  /**
   * POST /rpc/passkey/register-verify
   * パスキー登録レスポンスを検証
   */
  .post("/register-verify", async (c) => {
    try {
      // ユーザー認証を確認
      const request = c.req.raw;
      const user = await requireAuth(request, {
        cloudflare: { env: c.env, ctx: c.executionCtx },
      });

      // リクエストボディからレスポンスを取得
      // 型推論により、クライアント側から型安全にアクセス可能
      const registrationResponse = await c.req.json<RegistrationResponseJSON>();

      const db = drizzle(c.env.DB);

      // リクエストからoriginを取得
      const origin = new URL(request.url).origin;

      // パスキー登録を検証
      // @simplewebauthn/serverが厳密なWebAuthn検証を実施
      const result = await verifyPasskeyRegistration(
        user.id,
        registrationResponse,
        origin,
        db,
      );

      return c.json({
        success: true,
        passkey: {
          id: result.passkey.id,
          createdAt: result.passkey.createdAt,
        },
      });
    } catch (error) {
      return c.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "パスキー登録の検証に失敗しました",
        },
        400,
      );
    }
  })
  /**
   * GET /rpc/passkey/check
   * メールアドレスでパスキーが登録されているかチェック
   */
  .get("/check", async (c) => {
    try {
      const email = c.req.query("email");

      if (!email) {
        return c.json({ hasPasskey: false });
      }

      const db = drizzle(c.env.DB);

      // ユーザーを検索
      const user = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .get();

      if (!user) {
        return c.json({ hasPasskey: false });
      }

      // パスキーが登録されているかチェック
      const userPasskey = await db
        .select()
        .from(passkeys)
        .where(eq(passkeys.userId, user.id))
        .limit(1)
        .get();

      return c.json({
        hasPasskey: !!userPasskey,
      });
    } catch (_error) {
      return c.json({ hasPasskey: false }, 500);
    }
  })
  /**
   * GET /rpc/passkey/login-options
   * パスキーログインオプションを生成
   */
  .get("/login-options", async (c) => {
    try {
      const db = drizzle(c.env.DB);

      // クエリパラメータからメールアドレスを取得（オプション）
      const email = c.req.query("email") || null;
      const origin = new URL(c.req.raw.url).origin;

      // パスキーログインオプションを生成
      const options = await generatePasskeyAuthenticationOptions(
        email,
        origin,
        db,
      );

      return c.json(options);
    } catch (error) {
      return c.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "パスキーログインオプションの生成に失敗しました",
        },
        500,
      );
    }
  })
  /**
   * POST /rpc/passkey/login-verify
   * パスキーログインレスポンスを検証してセッション作成
   */
  .post("/login-verify", async (c) => {
    try {
      // リクエストボディからレスポンスを取得
      const authResponse = await c.req.json<AuthenticationResponseJSON>();

      const db = drizzle(c.env.DB);

      // リクエストからoriginを取得
      const origin = new URL(c.req.raw.url).origin;

      // パスキーログインを検証
      const result = await verifyPasskeyAuthentication(
        authResponse,
        origin,
        db,
      );

      if (!result.verified || !result.user) {
        return c.json({ error: "パスキーログインの検証に失敗しました" }, 400);
      }

      // セッション作成
      const auth = createAuthService({
        cloudflare: { env: c.env, ctx: c.executionCtx },
      });
      const token = await auth.createSession({
        id: result.user.id,
        email: result.user.email,
        emailVerified: !!result.user.emailVerified,
      });

      // Cookie 設定してレスポンス
      const cookie = setCookie("auth_token", token);

      return c.json(
        {
          success: true,
          user: {
            id: result.user.id,
            email: result.user.email,
          },
        },
        200,
        {
          "Set-Cookie": cookie,
        },
      );
    } catch (error) {
      return c.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "パスキーログインの検証に失敗しました",
        },
        400,
      );
    }
  });

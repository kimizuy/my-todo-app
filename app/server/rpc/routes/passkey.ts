import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { requireAuth } from "~/features/auth/lib/auth-service";
import {
  generatePasskeyRegistrationOptions,
  verifyPasskeyRegistration,
} from "~/features/auth/lib/webauthn";
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
  });

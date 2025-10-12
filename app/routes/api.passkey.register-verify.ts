import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { drizzle } from "drizzle-orm/d1";
import type { AppLoadContext } from "react-router";
import { requireAuth } from "~/features/auth/lib/auth-service";
import { verifyPasskeyRegistration } from "~/features/auth/lib/webauthn";

/**
 * パスキー登録レスポンスを検証するAPI
 * 認証済みユーザーのみがアクセス可能
 */
export async function action({
  request,
  context,
}: {
  request: Request;
  context: AppLoadContext;
}) {
  try {
    // ユーザー認証を確認
    const user = await requireAuth(request, context);

    // リクエストボディからレスポンスを取得
    const response = (await request.json()) as RegistrationResponseJSON;

    const db = drizzle(context.cloudflare.env.DB);

    // リクエストからoriginを取得
    const origin = new URL(request.url).origin;

    // パスキー登録を検証
    const result = await verifyPasskeyRegistration(
      user.id,
      response,
      origin,
      db,
    );

    return Response.json({
      success: true,
      passkey: {
        id: result.passkey.id,
        createdAt: result.passkey.createdAt,
      },
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "パスキー登録の検証に失敗しました",
      },
      { status: 400 },
    );
  }
}

import { drizzle } from "drizzle-orm/d1";
import type { AppLoadContext } from "react-router";
import { requireAuth } from "~/features/auth/lib/auth-service";
import { generatePasskeyRegistrationOptions } from "~/features/auth/lib/webauthn";

/**
 * パスキー登録オプションを生成するAPI
 * 認証済みユーザーのみがアクセス可能
 */
export async function loader({
  request,
  context,
}: {
  request: Request;
  context: AppLoadContext;
}) {
  try {
    // ユーザー認証を確認
    const user = await requireAuth(request, context);

    const db = drizzle(context.cloudflare.env.DB);

    // リクエストのoriginを取得
    const origin = new URL(request.url).origin;

    // パスキー登録オプションを生成
    const options = await generatePasskeyRegistrationOptions(
      user.id,
      user.email,
      origin,
      db,
    );

    return Response.json(options);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "パスキー登録オプションの生成に失敗しました",
      },
      { status: 500 },
    );
  }
}

import { drizzle } from "drizzle-orm/d1";
import type { AppLoadContext } from "react-router";
import { generatePasskeyAuthenticationOptions } from "~/features/auth/lib/webauthn";

/**
 * パスキーログインオプションを生成するAPI
 * メールアドレスを指定すると、そのユーザーのパスキーのみを許可
 * 指定しない場合は、すべてのパスキーを許可（discoverable credentials）
 */
export async function loader({
  request,
  context,
}: {
  request: Request;
  context: AppLoadContext;
}) {
  try {
    const db = drizzle(context.cloudflare.env.DB);

    // クエリパラメータからメールアドレスを取得（オプション）
    const url = new URL(request.url);
    const email = url.searchParams.get("email");
    const origin = url.origin;

    // パスキーログインオプションを生成
    const options = await generatePasskeyAuthenticationOptions(
      email,
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
            : "パスキーログインオプションの生成に失敗しました",
      },
      { status: 500 },
    );
  }
}

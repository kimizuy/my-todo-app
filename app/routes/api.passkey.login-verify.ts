import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { drizzle } from "drizzle-orm/d1";
import type { AppLoadContext } from "react-router";
import { redirect } from "react-router";
import { createAuthService } from "~/features/auth/lib/auth-service";
import { verifyPasskeyAuthentication } from "~/features/auth/lib/webauthn";
import { setCookie } from "~/shared/lib/cookies";

/**
 * パスキーログインレスポンスを検証するAPI
 * 検証成功後、セッションを作成してログイン
 */
export async function action({
  request,
  context,
}: {
  request: Request;
  context: AppLoadContext;
}) {
  try {
    // リクエストボディからレスポンスを取得
    const response = (await request.json()) as AuthenticationResponseJSON;

    const db = drizzle(context.cloudflare.env.DB);

    // リクエストからoriginを取得
    const origin = new URL(request.url).origin;

    // パスキーログインを検証
    const result = await verifyPasskeyAuthentication(response, origin, db);

    if (!result.verified || !result.user) {
      return Response.json(
        { error: "パスキーログインの検証に失敗しました" },
        { status: 400 },
      );
    }

    // セッション作成
    const auth = createAuthService(context);
    const token = await auth.createSession({
      id: result.user.id,
      email: result.user.email,
      emailVerified: !!result.user.emailVerified,
    });

    // Cookie 設定してホームにリダイレクト
    const cookie = setCookie("auth_token", token);

    return redirect("/", {
      headers: { "Set-Cookie": cookie },
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "パスキーログインの検証に失敗しました",
      },
      { status: 400 },
    );
  }
}

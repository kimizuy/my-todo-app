import { drizzle } from "drizzle-orm/d1";
import { Link, useLoaderData } from "react-router";
import { getAuthUser } from "~/features/auth/lib/auth-service";
import {
  markEmailAsVerified,
  verifyEmailToken,
} from "~/features/auth/lib/verification";
import { Button } from "~/shared/components/ui/button";
import { InvalidTokenError } from "~/shared/lib/errors";
import type { Route } from "./+types/route";

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return {
      success: false,
      error: "認証トークンが見つかりません",
      isLoggedIn: false,
    };
  }

  const db = drizzle(context.cloudflare.env.DB);

  try {
    // トークン検証
    const user = await verifyEmailToken(token, db);

    // メール認証完了
    await markEmailAsVerified(user.id, db);

    // セッションがあるかチェック
    const authUser = await getAuthUser(request, context);
    const isLoggedIn = !!authUser;

    return { success: true, error: null, isLoggedIn };
  } catch (error) {
    let errorMessage = "認証に失敗しました";

    if (error instanceof InvalidTokenError) {
      if (error.message.includes("expired")) {
        errorMessage = "認証トークンの有効期限が切れています";
      } else {
        errorMessage = "無効な認証トークンです";
      }
    }

    return {
      success: false,
      error: errorMessage,
      isLoggedIn: false,
    };
  }
}

export default function VerifyEmail() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="grid h-full place-items-center">
      <div className="w-full max-w-md space-y-6 rounded-lg border p-8 text-center">
        {data.success ? (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-label="成功アイコン"
              >
                <title>成功</title>
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold">メール認証完了</h1>
            <p className="text-muted-foreground">
              メールアドレスの認証が完了しました。
              <br />
              {data.isLoggedIn
                ? "サービスをご利用いただけます。"
                : "ログインしてサービスをご利用ください。"}
            </p>
            <Button asChild className="w-full">
              <Link to={data.isLoggedIn ? "/" : "/login"}>
                {data.isLoggedIn ? "メイン画面へ" : "ログインする"}
              </Link>
            </Button>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-label="エラーアイコン"
              >
                <title>エラー</title>
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold">認証に失敗しました</h1>
            <p className="text-muted-foreground">{data.error}</p>
            <Button asChild className="w-full">
              <Link to="/register">登録ページへ戻る</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

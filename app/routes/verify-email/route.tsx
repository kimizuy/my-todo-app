import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { redirect, useLoaderData } from "react-router";
import { Button } from "~/components/ui/button";
import { users } from "~/db/schema";
import { getAuthUser } from "~/lib/auth.server";
import { isTokenExpired } from "~/lib/token.server";
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

  // トークンでユーザーを検索
  const user = await db
    .select()
    .from(users)
    .where(eq(users.verificationToken, token))
    .get();

  if (!user) {
    return {
      success: false,
      error: "無効な認証トークンです",
      isLoggedIn: false,
    };
  }

  // トークンの有効期限チェック
  if (isTokenExpired(user.verificationTokenExpiry)) {
    return {
      success: false,
      error: "認証トークンの有効期限が切れています",
      isLoggedIn: false,
    };
  }

  // メール認証完了
  await db
    .update(users)
    .set({
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiry: null,
    })
    .where(eq(users.id, user.id));

  // セッションがあるかチェック
  const authUser = await getAuthUser(request, context);
  const isLoggedIn = !!authUser;

  return { success: true, error: null, isLoggedIn };
}

export default function VerifyEmail() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="flex min-h-screen items-center justify-center">
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
              <a href={data.isLoggedIn ? "/" : "/login"}>
                {data.isLoggedIn ? "メイン画面へ" : "ログインする"}
              </a>
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
              <a href="/register">登録ページへ戻る</a>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

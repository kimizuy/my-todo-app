import { drizzle } from "drizzle-orm/d1";
import { Check, X } from "lucide-react";
import { Link, useLoaderData } from "react-router";
import { getAuthUser } from "~/features/auth/lib/auth-service";
import {
  markEmailAsVerified,
  verifyEmailToken,
} from "~/features/auth/lib/verification";
import { verifyEmailSchema } from "~/features/auth/validation";
import { Button } from "~/shared/components/ui/button";
import { InvalidTokenError } from "~/shared/lib/errors";
import type { Route } from "./+types/route";

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const rawData = {
    token: url.searchParams.get("token"),
  };

  // バリデーション
  const validation = verifyEmailSchema.safeParse(rawData);
  if (!validation.success) {
    const firstError = validation.error.issues[0];
    return {
      success: false,
      error: firstError.message,
      isLoggedIn: false,
    };
  }

  const { token } = validation.data;

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
              <Check
                className="h-6 w-6 text-green-600"
                aria-label="成功アイコン"
              />
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
              <X className="h-6 w-6 text-red-600" aria-label="エラーアイコン" />
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

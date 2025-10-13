import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Check, X } from "lucide-react";
import { createSearchParamsCache, parseAsString } from "nuqs/server";
import { Link, useLoaderData, useNavigate } from "react-router";
import { usePasskeyRegistration } from "~/features/auth/hooks/usePasskeyRegistration";
import { getAuthUser } from "~/features/auth/lib/auth-service";
import {
  markEmailAsVerified,
  verifyEmailToken,
} from "~/features/auth/lib/verification";
import { passkeys } from "~/features/auth/schema";
import { verifyEmailSchema } from "~/features/auth/validation";
import { Button } from "~/shared/components/shadcn-ui/button";
import { InvalidTokenError } from "~/shared/utils/errors";
import type { Route } from "./+types/verify-email";

const searchParamsCache = createSearchParamsCache({
  token: parseAsString,
});

export async function loader({ request, context }: Route.LoaderArgs) {
  // URLパラメータからトークンを取得（nuqsで型安全に）
  const url = new URL(request.url);
  const { token } = searchParamsCache.parse(
    Object.fromEntries(url.searchParams),
  );

  // バリデーション
  const validation = verifyEmailSchema.safeParse({ token });
  if (!validation.success) {
    const firstError = validation.error.issues[0];
    return {
      success: false,
      error: firstError.message,
      isLoggedIn: false,
      hasPasskey: false,
    };
  }

  const { token: validatedToken } = validation.data;

  const db = drizzle(context.cloudflare.env.DB);

  try {
    // トークン検証
    const user = await verifyEmailToken(validatedToken, db);

    // メール認証完了
    await markEmailAsVerified(user.id, db);

    // セッションがあるかチェック
    const authUser = await getAuthUser(request, context);
    const isLoggedIn = !!authUser;

    // パスキーの有無をチェック
    const userPasskey = await db
      .select()
      .from(passkeys)
      .where(eq(passkeys.userId, user.id))
      .limit(1)
      .get();
    const hasPasskey = !!userPasskey;

    return { success: true, error: null, isLoggedIn, hasPasskey };
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
      hasPasskey: false,
    };
  }
}

export default function VerifyEmail() {
  const data = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const {
    register: handleRegisterPasskey,
    status: passkeyStatus,
    error,
  } = usePasskeyRegistration({
    onSuccess: () => {
      setTimeout(() => {
        navigate("/");
      }, 2000);
    },
  });

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
            </p>

            {data.isLoggedIn &&
            !data.hasPasskey &&
            passkeyStatus !== "success" ? (
              <>
                <div className="space-y-4 text-left">
                  <div className="rounded-lg bg-blue-50 p-4">
                    <h3 className="mb-2 text-sm font-semibold text-blue-900">
                      パスキーでもっと便利に
                    </h3>
                    <ul className="space-y-1 text-sm text-blue-800">
                      <li>• 生体認証やPINで簡単ログイン</li>
                      <li>• パスワード入力が不要</li>
                      <li>• より安全な認証方法</li>
                    </ul>
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 p-4">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Button
                    onClick={handleRegisterPasskey}
                    disabled={passkeyStatus === "registering"}
                    className="w-full"
                    size="lg"
                  >
                    {passkeyStatus === "registering"
                      ? "登録中..."
                      : "パスキーを登録する"}
                  </Button>
                  <Button asChild variant="ghost" className="w-full">
                    <Link to="/">後で登録する</Link>
                  </Button>
                </div>
              </>
            ) : passkeyStatus === "success" ? (
              <div className="rounded-lg bg-green-50 p-4">
                <p className="text-sm text-green-800">
                  パスキーの登録が完了しました！メイン画面へ移動します...
                </p>
              </div>
            ) : (
              <Button asChild className="w-full">
                <Link to={data.isLoggedIn ? "/" : "/login"}>
                  {data.isLoggedIn ? "メイン画面へ" : "ログインする"}
                </Link>
              </Button>
            )}
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

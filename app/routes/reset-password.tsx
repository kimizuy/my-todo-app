import { drizzle } from "drizzle-orm/d1";
import { ArrowLeft } from "lucide-react";
import { createSearchParamsCache, parseAsString } from "nuqs/server";
import { useId } from "react";
import {
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import {
  resetPassword,
  verifyResetToken,
} from "~/features/auth/password/reset";
import { getAuthUser } from "~/features/auth/service";
import { resetPasswordSchema } from "~/features/auth/validation";
import { Button } from "~/shared/components/shadcn-ui/button";
import { Input } from "~/shared/components/shadcn-ui/input";
import { Label } from "~/shared/components/shadcn-ui/label";
import { InvalidTokenError } from "~/shared/utils/errors";
import type { Route } from "./+types/reset-password";

const searchParamsCache = createSearchParamsCache({
  token: parseAsString,
});

export async function loader({ request, context }: Route.LoaderArgs) {
  // ログイン済みの場合はホームにリダイレクト
  const user = await getAuthUser(request, context);
  if (user) {
    throw redirect("/");
  }

  // URLパラメータからトークンを取得（nuqsで型安全に）
  const url = new URL(request.url);
  const { token } = searchParamsCache.parse(
    Object.fromEntries(url.searchParams),
  );

  if (!token) {
    return {
      error: "Invalid or missing token",
      token: null,
      email: null,
    };
  }

  try {
    // トークンを検証
    const db = drizzle(context.cloudflare.env.DB);
    const { email } = await verifyResetToken(token, db);

    return {
      error: null,
      token,
      email,
    };
  } catch (error) {
    if (error instanceof InvalidTokenError) {
      return {
        error: "このリンクは無効または期限切れです",
        token: null,
        email: null,
      };
    }
    throw error;
  }
}

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const rawData = {
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  // バリデーション
  const validation = resetPasswordSchema.safeParse(rawData);
  if (!validation.success) {
    const firstError = validation.error.issues[0];
    return { error: firstError.message };
  }

  const { token, password } = validation.data;
  const db = drizzle(context.cloudflare.env.DB);

  try {
    // パスワードをリセット
    await resetPassword(token, password, db);

    return { success: true };
  } catch (error) {
    if (error instanceof InvalidTokenError) {
      return { error: "このリンクは無効または期限切れです" };
    }
    console.error("Password reset error:", error);
    return { error: "パスワードのリセットに失敗しました" };
  }
}

export default function ResetPassword() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const passwordId = useId();
  const confirmPasswordId = useId();

  // リセット成功
  if (actionData?.success) {
    return (
      <div className="grid h-full place-items-center">
        <div className="w-full max-w-md space-y-8 rounded-lg border p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold">パスワードを変更しました</h1>
          </div>

          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              パスワードが正常に変更されました。
              <br />
              新しいパスワードでログインしてください。
            </p>
          </div>

          <div className="text-center">
            <Link to="/login">
              <Button className="w-full">ログインページへ</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // トークンエラー
  if (loaderData.error || !loaderData.token) {
    return (
      <div className="grid h-full place-items-center">
        <div className="w-full max-w-md space-y-8 rounded-lg border p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold">リンクが無効です</h1>
          </div>

          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">{loaderData.error}</p>
            <p className="text-muted-foreground text-sm">
              もう一度パスワードリセットをリクエストしてください。
            </p>
          </div>

          <div className="space-y-8">
            <Link to="/forgot-password" className="block space-y-8">
              <Button className="w-full">パスワードリセットをリクエスト</Button>
            </Link>
            <Link
              to="/login"
              className="text-muted-foreground flex items-center justify-center gap-1 underline"
            >
              <ArrowLeft className="size-4" />
              ログインに戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-full place-items-center">
      <div className="w-full max-w-md space-y-8 rounded-lg border p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">新しいパスワードを設定</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {loaderData.email}
          </p>
        </div>

        <Form method="post" className="space-y-6">
          <input type="hidden" name="token" value={loaderData.token} />

          <div className="space-y-2">
            <Label htmlFor={passwordId}>新しいパスワード</Label>
            <Input
              id={passwordId}
              name="password"
              type="password"
              required
              autoComplete="new-password"
              minLength={8}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={confirmPasswordId}>パスワード（確認）</Label>
            <Input
              id={confirmPasswordId}
              name="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              minLength={8}
            />
          </div>

          {actionData?.error && (
            <div className="text-sm text-red-600">{actionData.error}</div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "設定中..." : "パスワードを設定"}
          </Button>
        </Form>

        <div className="text-center text-sm">
          <Link
            to="/login"
            className="text-muted-foreground flex items-center justify-center gap-1 underline"
          >
            <ArrowLeft className="size-4" />
            ログインに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}

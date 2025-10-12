import { drizzle } from "drizzle-orm/d1";
import { useId } from "react";
import {
  Form,
  Link,
  redirect,
  useActionData,
  useNavigation,
} from "react-router";
import { getAuthUser } from "~/features/auth/lib/auth-service";
import { requestPasswordReset } from "~/features/auth/lib/password-reset";
import { forgotPasswordSchema } from "~/features/auth/validation";
import { Button } from "~/shared/components/shadcn-ui/button";
import { Input } from "~/shared/components/shadcn-ui/input";
import { Label } from "~/shared/components/shadcn-ui/label";
import type { Route } from "./+types/forgot-password";

export async function loader({ request, context }: Route.LoaderArgs) {
  const user = await getAuthUser(request, context);
  if (user) {
    throw redirect("/");
  }
  return null;
}

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const rawData = {
    email: formData.get("email"),
  };

  // バリデーション
  const validation = forgotPasswordSchema.safeParse(rawData);
  if (!validation.success) {
    const firstError = validation.error.issues[0];
    return { error: firstError.message };
  }

  const { email } = validation.data;
  const db = drizzle(context.cloudflare.env.DB);
  const origin = new URL(request.url).origin;
  const apiKey = context.cloudflare.env.RESEND_API_KEY;

  try {
    // パスワードリセットをリクエスト
    await requestPasswordReset(email, origin, apiKey, db);

    // セキュリティ: ユーザーの存在に関わらず同じメッセージを返す
    return { success: true };
  } catch (error) {
    console.error("Password reset request error:", error);
    // エラーが発生しても成功メッセージを返す（セキュリティ）
    return { success: true };
  }
}

export default function ForgotPassword() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const emailId = useId();

  if (actionData?.success) {
    return (
      <div className="grid h-full place-items-center">
        <div className="w-full max-w-md space-y-8 rounded-lg border p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold">メールを送信しました</h1>
          </div>

          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              入力されたメールアドレスがアカウントに登録されている場合、パスワードリセット用のリンクを送信しました。
            </p>
            <p className="text-muted-foreground text-sm">
              メールが届かない場合は、迷惑メールフォルダをご確認ください。
            </p>
          </div>

          <div className="text-center text-sm">
            <Link to="/login" className="underline">
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
          <h1 className="text-2xl font-bold">パスワードを忘れた方</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            登録したメールアドレスを入力してください。
            <br />
            パスワードリセット用のリンクをお送りします。
          </p>
        </div>

        <Form method="post" className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor={emailId}>メールアドレス</Label>
            <Input
              id={emailId}
              name="email"
              type="email"
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          {actionData?.error && (
            <div className="text-sm text-red-600">{actionData.error}</div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "送信中..." : "リセットリンクを送信"}
          </Button>
        </Form>

        <div className="text-center text-sm">
          <Link to="/login" className="text-muted-foreground underline">
            ← ログインに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}

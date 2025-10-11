import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { useId } from "react";
import {
  Form,
  Link,
  redirect,
  useActionData,
  useNavigation,
} from "react-router";
import {
  createAuthService,
  getAuthUser,
} from "~/features/auth/lib/auth-service";
import { verifyPassword } from "~/features/auth/lib/password";
import { users } from "~/features/auth/schema";
import { loginSchema } from "~/features/auth/validation";
import { Button } from "~/shared/components/ui/button";
import { Input } from "~/shared/components/ui/input";
import { Label } from "~/shared/components/ui/label";
import { setCookie } from "~/shared/lib/cookies";
import type { Route } from "./+types/route";

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
    password: formData.get("password"),
  };

  // バリデーション
  const validation = loginSchema.safeParse(rawData);
  if (!validation.success) {
    const firstError = validation.error.issues[0];
    return { error: firstError.message };
  }

  const { email, password } = validation.data;
  const db = drizzle(context.cloudflare.env.DB);

  // ユーザー検索
  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .get();

  if (!user) {
    return { error: "Invalid email or password" };
  }

  // パスワード検証
  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return { error: "Invalid email or password" };
  }

  // メール認証チェック（厳格な認証）
  if (!user.emailVerified) {
    return {
      error:
        "メールアドレスが認証されていません。登録時に送信されたメールから認証を完了してください。",
    };
  }

  // セッション作成
  const auth = createAuthService(context);
  const token = await auth.createSession({
    id: user.id,
    email: user.email,
    emailVerified: !!user.emailVerified,
  });

  // Cookie 設定
  const cookie = setCookie("auth_token", token);

  return redirect("/", {
    headers: { "Set-Cookie": cookie },
  });
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const emailId = useId();
  const passwordId = useId();

  return (
    <div className="grid h-full place-items-center">
      <div className="w-full max-w-md space-y-8 rounded-lg border p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">ログイン</h1>
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
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={passwordId}>パスワード</Label>
            <Input
              id={passwordId}
              name="password"
              type="password"
              required
              autoComplete="current-password"
              minLength={8}
            />
          </div>

          {actionData?.error && (
            <div className="text-sm text-red-600">{actionData.error}</div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "ログイン中..." : "ログイン"}
          </Button>
        </Form>

        <div className="space-y-2 text-center text-sm">
          <div>
            アカウントをお持ちでない方は{" "}
            <Link to="/register" className="underline">
              登録
            </Link>
          </div>
          <div>
            <Link to="/auth" className="text-muted-foreground underline">
              ← 戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

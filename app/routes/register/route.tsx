import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { useId } from "react";
import { Form, redirect, useActionData, useNavigation } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { users } from "~/db/schema";
import { createAuthService, getAuthUser } from "~/lib/auth.server";
import { setCookie } from "~/lib/cookies.server";
import { hashPassword } from "~/lib/password.server";
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
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // バリデーション
  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  const db = drizzle(context.cloudflare.env.DB);

  // 既存ユーザーチェック
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .get();

  if (existingUser) {
    return { error: "Email already exists" };
  }

  // パスワードハッシュ化
  const passwordHash = await hashPassword(password);

  // ユーザー作成
  const [newUser] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
    })
    .returning({ id: users.id, email: users.email });

  if (!newUser) {
    return { error: "Failed to create user" };
  }

  // セッション作成
  const auth = createAuthService(context);
  const token = await auth.createSession({
    id: newUser.id,
    email: newUser.email,
  });

  // Cookie 設定
  const cookie = setCookie("auth_token", token);

  return redirect("/", {
    headers: { "Set-Cookie": cookie },
  });
}

export default function Register() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const emailId = useId();
  const passwordId = useId();

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 rounded-lg border p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">新規登録</h1>
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
              autoComplete="new-password"
              minLength={8}
            />
            <p className="text-muted-foreground text-sm">
              8文字以上で入力してください
            </p>
          </div>

          {actionData?.error && (
            <div className="text-sm text-red-600">{actionData.error}</div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "登録中..." : "登録"}
          </Button>
        </Form>

        <div className="text-center text-sm">
          既にアカウントをお持ちの方は{" "}
          <a href="/login" className="underline">
            ログイン
          </a>
        </div>
      </div>
    </div>
  );
}

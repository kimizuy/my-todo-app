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
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { users } from "~/db/schema";
import { createAuthService, getAuthUser } from "~/lib/auth.server";
import { setCookie } from "~/lib/cookies.server";
import { sendVerificationEmail } from "~/lib/email.server";
import { hashPassword } from "~/lib/password.server";
import {
  generateTokenExpiry,
  generateVerificationToken,
} from "~/lib/token.server";
import type { Route } from "./+types/route";

export async function loader({ request, context }: Route.LoaderArgs) {
  const user = await getAuthUser(request, context);
  if (user) {
    throw redirect("/");
  }
  return null;
}

export async function action({ request, context }: Route.ActionArgs) {
  console.log("=== Register action called ===");
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

  // 認証トークン生成
  const verificationToken = generateVerificationToken();
  const verificationTokenExpiry = generateTokenExpiry();

  // ユーザー作成
  const [newUser] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      verificationToken,
      verificationTokenExpiry,
    })
    .returning({ id: users.id, email: users.email });

  if (!newUser) {
    return { error: "Failed to create user" };
  }

  // 認証メール送信
  const apiKey = context.cloudflare.env.RESEND_API_KEY;
  if (apiKey) {
    const baseUrl = new URL(request.url).origin;
    console.log("Attempting to send verification email to:", email);
    const emailResult = await sendVerificationEmail(
      { email, token: verificationToken, baseUrl },
      apiKey,
    );
    if (emailResult.success) {
      console.log("Verification email sent successfully");
    } else {
      console.error("Failed to send verification email:", emailResult.error);
      return { error: "認証メールの送信に失敗しました" };
    }
  } else {
    console.warn("RESEND_API_KEY is not set, skipping verification email");
    return { error: "メール送信サービスが設定されていません" };
  }

  // セッション作成（メール未認証でもログイン状態にする）
  const auth = createAuthService(context);
  const token = await auth.createSession({
    id: newUser.id,
    email: newUser.email,
  });

  // Cookie 設定
  const cookie = setCookie("auth_token", token);

  // メール認証待ち画面にリダイレクト
  return redirect("/verify-email-pending", {
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
    <div className="grid h-full place-items-center">
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

        <div className="space-y-2 text-center text-sm">
          <div>
            既にアカウントをお持ちの方は{" "}
            <Link to="/login" className="underline">
              ログイン
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

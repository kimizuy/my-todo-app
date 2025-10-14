import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { ArrowLeft } from "lucide-react";
import { useId } from "react";
import {
  Form,
  Link,
  redirect,
  useActionData,
  useNavigation,
} from "react-router";
import { sendVerificationEmail } from "~/features/auth/email/send";
import { hashPassword } from "~/features/auth/password/hash";
import { users } from "~/features/auth/schema";
import { createAuthService, getAuthUser } from "~/features/auth/service";
import {
  generateTokenExpiry,
  generateVerificationToken,
} from "~/features/auth/session/token";
import { registerSchema } from "~/features/auth/validation";
import { Button } from "~/shared/components/shadcn-ui/button";
import { Input } from "~/shared/components/shadcn-ui/input";
import { Label } from "~/shared/components/shadcn-ui/label";
import { setCookie } from "~/shared/utils/cookies";
import type { Route } from "./+types/register";

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
  const rawData = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  // バリデーション
  const validation = registerSchema.safeParse(rawData);
  if (!validation.success) {
    const firstError = validation.error.issues[0];
    return { error: firstError.message };
  }

  const { email, password } = validation.data;
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
    emailVerified: false,
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

        <div className="space-y-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background text-muted-foreground px-2">
                または
              </span>
            </div>
          </div>

          <Button asChild variant="outline" className="w-full">
            <a href="/rpc/oauth/google/authorize">
              <svg
                className="mr-2 h-4 w-4"
                viewBox="0 0 24 24"
                role="img"
                aria-label="Google logo"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Googleで登録
            </a>
          </Button>
        </div>

        <div className="space-y-8 text-center text-sm">
          <div>
            既にアカウントをお持ちの方は{" "}
            <Link to="/login" className="underline">
              ログイン
            </Link>
          </div>
          <div>
            <Link
              to="/auth"
              className="text-muted-foreground flex items-center justify-center gap-1 underline"
            >
              <ArrowLeft className="size-4" />
              戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

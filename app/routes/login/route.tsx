import {
  type PublicKeyCredentialRequestOptionsJSON,
  startAuthentication,
} from "@simplewebauthn/browser";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { useId, useState } from "react";
import {
  Form,
  Link,
  redirect,
  useActionData,
  useNavigate,
  useNavigation,
} from "react-router";
import {
  createAuthService,
  getAuthUser,
} from "~/features/auth/lib/auth-service";
import { verifyPassword } from "~/features/auth/lib/password";
import { passkeys, users } from "~/features/auth/schema";
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

  // パスワードハッシュが設定されていない場合（パスキーのみのユーザー）
  if (!user.passwordHash) {
    return {
      error:
        "このアカウントはパスキーのみで認証されています。パスキーでログインしてください。",
    };
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

  // パスキーの有無をチェック
  const userPasskey = await db
    .select()
    .from(passkeys)
    .where(eq(passkeys.userId, user.id))
    .limit(1)
    .get();

  // パスキーがない場合は登録を促すクエリパラメータ付きでリダイレクト
  const redirectUrl = userPasskey ? "/" : "/?prompt_passkey=true";

  return redirect(redirectUrl, {
    headers: { "Set-Cookie": cookie },
  });
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const isSubmitting = navigation.state === "submitting";
  const emailId = useId();
  const passwordId = useId();

  const [passkeyStatus, setPasskeyStatus] = useState<
    "idle" | "authenticating" | "error"
  >("idle");
  const [passkeyError, setPasskeyError] = useState<string | null>(null);

  const handlePasskeyLogin = async () => {
    try {
      setPasskeyStatus("authenticating");
      setPasskeyError(null);

      const optionsResponse = await fetch("/api/passkey/login-options");
      if (!optionsResponse.ok) {
        throw new Error("ログインオプションの取得に失敗しました");
      }
      const options =
        (await optionsResponse.json()) as PublicKeyCredentialRequestOptionsJSON;

      const authenticationResponse = await startAuthentication({
        optionsJSON: options,
      });

      const verifyResponse = await fetch("/api/passkey/login-verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(authenticationResponse),
      });

      if (!verifyResponse.ok) {
        const errorData = (await verifyResponse.json()) as { error?: string };
        throw new Error(errorData.error || "パスキーログインに失敗しました");
      }

      navigate("/");
    } catch (err) {
      // ユーザーがキャンセルした場合はエラー表示しない
      if (err instanceof Error && err.name === "NotAllowedError") {
        setPasskeyStatus("idle");
        return;
      }

      setPasskeyError(
        err instanceof Error ? err.message : "パスキーログインに失敗しました",
      );
      setPasskeyStatus("error");
    }
  };

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

        {passkeyError && (
          <div className="rounded-lg bg-red-50 p-4">
            <p className="text-sm text-red-800">{passkeyError}</p>
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handlePasskeyLogin}
          disabled={passkeyStatus === "authenticating"}
        >
          {passkeyStatus === "authenticating"
            ? "認証中..."
            : "パスキーでログイン"}
        </Button>

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

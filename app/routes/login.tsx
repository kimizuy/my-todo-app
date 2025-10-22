import { startAuthentication } from "@simplewebauthn/browser";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { useEffect, useId, useRef, useState } from "react";
import {
  Form,
  Link,
  redirect,
  useActionData,
  useNavigate,
  useNavigation,
} from "react-router";
import { passkeyApi } from "~/client/rpc";
import { verifyPassword } from "~/features/auth/password/hash";
import { passkeys, users } from "~/features/auth/schema";
import { createAuthService, getAuthUser } from "~/features/auth/service";
import { loginSchema } from "~/features/auth/validation";
import { Button } from "~/shared/components/shadcn-ui/button";
import { Input } from "~/shared/components/shadcn-ui/input";
import { Label } from "~/shared/components/shadcn-ui/label";
import { setCookie } from "~/shared/utils/cookies";
import type { Route } from "./+types/login";

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
  const authCookie = setCookie("auth_token", token);

  // パスキーの有無をチェック
  const userPasskey = await db
    .select()
    .from(passkeys)
    .where(eq(passkeys.userId, user.id))
    .limit(1)
    .get();

  // パスキーがない場合は登録を促すクエリパラメータ付きでリダイレクト
  // ログイン成功フラグも追加
  const redirectUrl = userPasskey
    ? "/?login_success=1"
    : "/?prompt_passkey=true&login_success=1";

  return redirect(redirectUrl, {
    headers: { "Set-Cookie": authCookie },
  });
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const isSubmitting = navigation.state === "submitting";
  const emailId = useId();
  const passwordId = useId();
  const headingId = useId();
  const descriptionId = useId();
  const errorId = useId();

  const [passkeyStatus, setPasskeyStatus] = useState<
    "idle" | "authenticating" | "error"
  >("idle");
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [isConditionalUIAvailable, setIsConditionalUIAvailable] =
    useState(false);
  const [conditionalUIStarted, setConditionalUIStarted] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);

  // エラー発生時にフォーカスを移動
  useEffect(() => {
    if (actionData?.error && errorRef.current) {
      errorRef.current.focus();
    }
  }, [actionData?.error]);

  // Conditional UIの利用可能性をチェック
  useEffect(() => {
    const checkConditionalUI = async () => {
      if (
        window.PublicKeyCredential &&
        typeof window.PublicKeyCredential.isConditionalMediationAvailable ===
          "function"
      ) {
        const available =
          await window.PublicKeyCredential.isConditionalMediationAvailable();
        setIsConditionalUIAvailable(available);
      }
    };
    checkConditionalUI();
  }, []);

  // Conditional UIを開始（ページロード時に1回のみ）
  useEffect(() => {
    if (!isConditionalUIAvailable || conditionalUIStarted) return;

    const startConditionalUI = async () => {
      try {
        setConditionalUIStarted(true);
        const options = await passkeyApi.getLoginOptions();

        const authenticationResponse = await startAuthentication({
          optionsJSON: options,
          useBrowserAutofill: true, // Conditional UI有効化
        });

        await passkeyApi.verifyLogin(authenticationResponse);
        // sessionStorageにログイン成功フラグを設定
        sessionStorage.setItem("justLoggedIn", "true");
        navigate("/");
      } catch (err) {
        // Conditional UIのエラーは静かに無視（ユーザーが選択しなかっただけ）
        // AbortErrorやNotAllowedErrorは正常な動作
        if (
          err instanceof Error &&
          (err.name === "AbortError" ||
            err.name === "NotAllowedError" ||
            err.name === "InvalidStateError")
        ) {
          // 静かに無視
          return;
        }
        console.error("Conditional UI error:", err);
      }
    };

    startConditionalUI();
  }, [isConditionalUIAvailable, conditionalUIStarted, navigate]);

  const handleDirectPasskeyLogin = async () => {
    try {
      setStatusMessage("パスキー認証を開始しています...");
      setPasskeyStatus("authenticating");
      setPasskeyError(null);

      // メールアドレスなしでパスキー認証を開始
      const options = await passkeyApi.getLoginOptions();
      setStatusMessage("認証情報を確認しています...");

      const authenticationResponse = await startAuthentication({
        optionsJSON: options,
      });

      setStatusMessage("認証を検証しています...");
      await passkeyApi.verifyLogin(authenticationResponse);

      setStatusMessage("ログインに成功しました。リダイレクトしています...");
      // sessionStorageにログイン成功フラグを設定
      sessionStorage.setItem("justLoggedIn", "true");
      navigate("/");
    } catch (err) {
      setStatusMessage("");
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
      {/* ライブリージョン（スクリーンリーダー専用） */}
      {/* biome-ignore lint/a11y/useSemanticElements: スクリーンリーダー専用の非表示要素 */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {statusMessage}
      </div>

      <div className="w-full max-w-md space-y-8 rounded-lg border p-8">
        <div className="text-center">
          <h1 id={headingId} className="text-2xl font-bold">
            ログイン
          </h1>
        </div>

        <Form
          method="post"
          className="space-y-6"
          aria-labelledby={headingId}
          aria-describedby={descriptionId}
        >
          <div id={descriptionId} className="sr-only">
            メールアドレスとパスワードを入力してログインしてください。パスキーまたはGoogleアカウントでもログインできます。
          </div>
          <div className="space-y-2">
            <Label htmlFor={emailId}>メールアドレス</Label>
            <Input
              id={emailId}
              name="email"
              type="email"
              required
              autoComplete="username webauthn"
              autoFocus
              aria-required="true"
              aria-invalid={!!actionData?.error}
              aria-describedby={actionData?.error ? errorId : undefined}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={passwordId}>パスワード</Label>
              <Link
                to="/forgot-password"
                className="text-muted-foreground hover:text-foreground text-sm underline"
              >
                パスワードを忘れた方
              </Link>
            </div>
            <Input
              id={passwordId}
              name="password"
              type="password"
              required
              autoComplete="current-password"
              minLength={8}
              aria-required="true"
              aria-invalid={!!actionData?.error}
              aria-describedby={actionData?.error ? errorId : undefined}
            />
          </div>

          {actionData?.error && (
            <div
              id={errorId}
              ref={errorRef}
              tabIndex={-1}
              role="alert"
              aria-live="polite"
              className="rounded p-2 text-sm text-red-600 focus:ring-2 focus:ring-red-500 focus:outline-none"
            >
              <span className="sr-only">エラー: </span>
              {actionData.error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "ログイン中..." : "ログイン"}
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

          {passkeyError && (
            <div
              role="alert"
              aria-live="assertive"
              className="rounded-lg bg-red-50 p-4"
            >
              <p className="text-sm text-red-800">
                <span className="sr-only">エラー: </span>
                {passkeyError}
              </p>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleDirectPasskeyLogin}
            disabled={passkeyStatus === "authenticating"}
            aria-busy={passkeyStatus === "authenticating"}
          >
            {passkeyStatus === "authenticating"
              ? "認証中..."
              : "パスキーでログイン"}
          </Button>

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
              Googleでログイン
            </a>
          </Button>
        </div>

        <div className="space-y-8 text-center text-sm">
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

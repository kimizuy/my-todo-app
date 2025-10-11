import { Mail } from "lucide-react";
import { useState } from "react";
import { Link, useFetcher, useLoaderData } from "react-router";
import { requireAuth } from "~/features/auth/lib/auth-service";
import { Button } from "~/shared/components/ui/button";
import type { Route } from "./+types/route";

export async function loader({ request, context }: Route.LoaderArgs) {
  const user = await requireAuth(request, context);
  return { email: user.email };
}

export default function VerifyEmailPending() {
  const { email } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [cooldown, setCooldown] = useState(0);

  const handleResend = () => {
    fetcher.submit(
      { email },
      { method: "post", action: "/api/auth/resend-verification" },
    );
    // 60秒のクールダウンを開始
    setCooldown(60);
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const isSubmitting = fetcher.state === "submitting";
  const isDisabled = isSubmitting || cooldown > 0;

  return (
    <div className="grid h-full place-items-center">
      <div className="w-full max-w-md space-y-6 rounded-lg border p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <Mail
              className="h-8 w-8 text-blue-600"
              aria-label="メールアイコン"
            />
          </div>
          <h1 className="mb-2 text-2xl font-bold">
            メールアドレスを確認してください
          </h1>
          <p className="text-muted-foreground mb-6 text-left">
            登録いただいたメールアドレスに認証リンクを送信しました。メール内のリンクをクリックして、アカウントを有効化してください。
          </p>
        </div>

        <div className="rounded-lg bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">
            <strong>重要:</strong>{" "}
            メールが届かない場合は、迷惑メールフォルダもご確認ください。
          </p>
        </div>

        {/* 成功メッセージ */}
        {fetcher.data?.success && (
          <div className="rounded-lg bg-green-50 p-4">
            <p className="text-sm text-green-800">
              認証メールを再送信しました。メールをご確認ください。
            </p>
          </div>
        )}

        {/* エラーメッセージ */}
        {fetcher.data?.error && (
          <div className="rounded-lg bg-red-50 p-4">
            <p className="text-sm text-red-800">{fetcher.data.error}</p>
          </div>
        )}

        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">
            認証リンクは24時間有効です。
          </p>

          {/* 認証メール再送信ボタン */}
          <Button
            onClick={handleResend}
            disabled={isDisabled}
            variant="outline"
            className="w-full"
          >
            {isSubmitting
              ? "送信中..."
              : cooldown > 0
                ? `再送信 (${cooldown}秒後に可能)`
                : "認証メールを再送信"}
          </Button>

          <Button asChild variant="outline" className="w-full">
            <Link to="/login">ログインページへ戻る</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

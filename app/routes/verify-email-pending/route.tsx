import { Link } from "react-router";
import { Button } from "~/shared/components/ui/button";

export default function VerifyEmailPending() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-6 rounded-lg border p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <svg
              className="h-8 w-8 text-blue-600"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-label="メールアイコン"
            >
              <title>メールアイコン</title>
              <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="mb-2 text-2xl font-bold">
            メールアドレスを確認してください
          </h1>
          <p className="text-muted-foreground mb-6">
            登録いただいたメールアドレスに認証リンクを送信しました。
            <br />
            メール内のリンクをクリックして、アカウントを有効化してください。
          </p>
        </div>

        <div className="rounded-lg bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">
            <strong>重要:</strong>{" "}
            メールが届かない場合は、迷惑メールフォルダもご確認ください。
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">
            認証リンクは24時間有効です。
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link to="/login">ログインページへ戻る</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

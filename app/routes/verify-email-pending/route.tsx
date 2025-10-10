import { Mail } from "lucide-react";
import { Link } from "react-router";
import { Button } from "~/shared/components/ui/button";

export default function VerifyEmailPending() {
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

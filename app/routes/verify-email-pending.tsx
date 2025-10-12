import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Mail } from "lucide-react";
import { useState } from "react";
import { Link, useFetcher, useLoaderData } from "react-router";
import { requireAuth } from "~/features/auth/lib/auth-service";
import { sendVerificationEmail } from "~/features/auth/lib/email";
import {
  generateTokenExpiry,
  generateVerificationToken,
} from "~/features/auth/lib/token";
import { regenerateVerificationToken } from "~/features/auth/lib/verification";
import { users } from "~/features/auth/schema";
import { resendVerificationSchema } from "~/features/auth/validation";
import { Button } from "~/shared/components/ui/button";
import { AppError, errorResponse, formatZodError } from "~/shared/lib/errors";
import type { Route } from "./+types/verify-email-pending";

export async function loader({ request, context }: Route.LoaderArgs) {
  const user = await requireAuth(request, context);
  return { email: user.email };
}

export async function action({ request, context }: Route.ActionArgs) {
  try {
    const formData = await request.formData();
    const rawData = {
      email: formData.get("email"),
    };

    // バリデーション
    const validation = resendVerificationSchema.safeParse(rawData);
    if (!validation.success) {
      throw formatZodError(validation.error);
    }

    const { email } = validation.data;
    const db = drizzle(context.cloudflare.env.DB);

    // ユーザー検索
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .get();

    if (!user) {
      // セキュリティ上、ユーザーの存在を明かさない
      return {
        success: true,
        message: "If the email exists, a verification email has been sent",
      };
    }

    // すでに認証済みの場合
    if (user.emailVerified) {
      // セキュリティ上、認証済みかどうかも明かさない
      return {
        success: true,
        message: "If the email exists, a verification email has been sent",
      };
    }

    // 新しいトークンを生成
    const token = generateVerificationToken();
    const expiry = generateTokenExpiry();

    // トークンをDBに保存
    await regenerateVerificationToken(user.id, token, expiry, db);

    // メール送信
    const apiKey = context.cloudflare.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("RESEND_API_KEY is not set");
      throw new AppError("Email service is not configured", 500);
    }

    const baseUrl = new URL(request.url).origin;
    const result = await sendVerificationEmail(
      { email, token, baseUrl },
      apiKey,
    );

    if (!result.success) {
      throw new AppError("Failed to send verification email", 500);
    }

    return {
      success: true,
      message: "Verification email sent",
    };
  } catch (error) {
    return errorResponse(error);
  }
}

export default function VerifyEmailPending() {
  const { email } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [cooldown, setCooldown] = useState(0);

  const handleResend = () => {
    fetcher.submit({ email }, { method: "post" });
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

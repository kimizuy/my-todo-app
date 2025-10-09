import { Resend } from "resend";

interface SendVerificationEmailParams {
  email: string;
  token: string;
  baseUrl: string;
}

/**
 * メール認証リンクを送信
 */
export async function sendVerificationEmail(
  params: SendVerificationEmailParams,
  apiKey: string,
): Promise<{ success: boolean; error?: string }> {
  const { email, token, baseUrl } = params;

  const resend = new Resend(apiKey);
  const verificationUrl = `${baseUrl}/verify-email?token=${token}`;

  try {
    const result = await resend.emails.send({
      from: "onboarding@resend.dev", // 開発・テスト用（本番では独自ドメインに変更）
      to: email,
      subject: "メールアドレスを認証してください",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #4a5568;">メールアドレスの認証</h1>
            <p>アカウント登録ありがとうございます。</p>
            <p>以下のボタンをクリックして、メールアドレスを認証してください:</p>
            <div style="margin: 30px 0;">
              <a href="${verificationUrl}"
                 style="background-color: #4299e1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                メールアドレスを認証
              </a>
            </div>
            <p style="color: #718096; font-size: 14px;">
              ボタンが機能しない場合は、以下のURLをコピーしてブラウザに貼り付けてください:
            </p>
            <p style="color: #718096; font-size: 12px; word-break: break-all;">
              ${verificationUrl}
            </p>
            <p style="color: #718096; font-size: 14px; margin-top: 30px;">
              このリンクは24時間有効です。
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            <p style="color: #a0aec0; font-size: 12px;">
              このメールに心当たりがない場合は、無視してください。
            </p>
          </body>
        </html>
      `,
    });

    console.log("Resend response:", JSON.stringify(result, null, 2));
    return { success: true };
  } catch (error) {
    console.error("Failed to send verification email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

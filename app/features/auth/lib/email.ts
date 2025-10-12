import { Resend } from "resend";
import { DEFAULT_EMAIL_FROM } from "~/shared/lib/config";
import { getVerificationEmailTemplate } from "./email-templates";

interface SendVerificationEmailParams {
  email: string;
  token: string;
  baseUrl: string;
}

interface SendEmailOptions {
  fromAddress?: string;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * 汎用メール送信関数
 */
export async function sendEmail(
  params: SendEmailParams,
  apiKey: string,
  options: SendEmailOptions = {},
): Promise<{ success: boolean; error?: string }> {
  const { to, subject, html } = params;
  const { fromAddress = DEFAULT_EMAIL_FROM } = options;

  const resend = new Resend(apiKey);

  try {
    const result = await resend.emails.send({
      from: fromAddress,
      to,
      subject,
      html,
    });

    console.log("Resend response:", JSON.stringify(result, null, 2));
    return { success: true };
  } catch (error) {
    console.error("Failed to send email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * メール認証リンクを送信
 */
export async function sendVerificationEmail(
  params: SendVerificationEmailParams,
  apiKey: string,
  options: SendEmailOptions = {},
): Promise<{ success: boolean; error?: string }> {
  const { email, token, baseUrl } = params;

  const verificationUrl = `${baseUrl}/verify-email?token=${token}`;
  const emailContent = await getVerificationEmailTemplate({ verificationUrl });

  return sendEmail(
    {
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
    },
    apiKey,
    options,
  );
}

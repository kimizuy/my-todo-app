import { Resend } from "resend";
import { DEFAULT_EMAIL_FROM } from "./config.server";
import { getVerificationEmailTemplate } from "./email-templates";

interface SendVerificationEmailParams {
  email: string;
  token: string;
  baseUrl: string;
}

interface SendEmailOptions {
  fromAddress?: string;
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
  const { fromAddress = DEFAULT_EMAIL_FROM } = options;

  const resend = new Resend(apiKey);
  const verificationUrl = `${baseUrl}/verify-email?token=${token}`;
  const emailContent = getVerificationEmailTemplate({ verificationUrl });

  try {
    const result = await resend.emails.send({
      from: fromAddress,
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
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

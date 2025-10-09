import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { ActionFunctionArgs } from "react-router";
import { users } from "~/db/schema";
import { sendVerificationEmail } from "~/lib/email.server";
import { AppError, errorResponse, formatZodError } from "~/lib/errors.server";
import {
  generateTokenExpiry,
  generateVerificationToken,
} from "~/lib/token.server";
import { resendVerificationSchema } from "~/lib/validation.server";
import { regenerateVerificationToken } from "~/lib/verification.server";

export async function action({ request, context }: ActionFunctionArgs) {
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
      return Response.json({
        success: true,
        message: "If the email exists, a verification email has been sent",
      });
    }

    // すでに認証済みの場合
    if (user.emailVerified) {
      // セキュリティ上、認証済みかどうかも明かさない
      return Response.json({
        success: true,
        message: "If the email exists, a verification email has been sent",
      });
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

    return Response.json({
      success: true,
      message: "Verification email sent",
    });
  } catch (error) {
    return errorResponse(error);
  }
}

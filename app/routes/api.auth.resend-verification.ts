import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { ActionFunctionArgs } from "react-router";
import { users } from "~/db/schema";
import { sendVerificationEmail } from "~/lib/email.server";
import {
  generateTokenExpiry,
  generateVerificationToken,
} from "~/lib/token.server";

export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email") as string;

  if (!email) {
    return Response.json({ error: "Email is required" }, { status: 400 });
  }

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
    return Response.json(
      { error: "Email is already verified" },
      { status: 400 },
    );
  }

  // 新しいトークンを生成
  const token = generateVerificationToken();
  const expiry = generateTokenExpiry();

  // トークンをDBに保存
  await db
    .update(users)
    .set({
      verificationToken: token,
      verificationTokenExpiry: expiry,
    })
    .where(eq(users.id, user.id));

  // メール送信
  const apiKey = context.cloudflare.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set");
    return Response.json(
      { error: "Email service is not configured" },
      { status: 500 },
    );
  }

  const baseUrl = new URL(request.url).origin;
  const result = await sendVerificationEmail({ email, token, baseUrl }, apiKey);

  if (!result.success) {
    return Response.json(
      { error: "Failed to send verification email" },
      { status: 500 },
    );
  }

  return Response.json({
    success: true,
    message: "Verification email sent",
  });
}

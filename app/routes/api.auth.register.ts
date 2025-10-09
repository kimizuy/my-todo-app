import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { ActionFunctionArgs } from "react-router";
import { users } from "~/db/schema";
import { createAuthService } from "~/lib/auth.server";
import { setCookie } from "~/lib/cookies.server";
import { sendVerificationEmail } from "~/lib/email.server";
import { hashPassword } from "~/lib/password.server";
import {
  generateTokenExpiry,
  generateVerificationToken,
} from "~/lib/token.server";

export async function action({ request, context }: ActionFunctionArgs) {
  console.log("=== Register API called ===");
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  console.log("Email:", email);
  console.log("Password length:", password?.length);

  // バリデーション
  if (!email || !password) {
    return Response.json(
      { error: "Email and password are required" },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return Response.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }

  const db = drizzle(context.cloudflare.env.DB);

  // 既存ユーザーチェック（型安全）
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .get();

  if (existingUser) {
    return Response.json({ error: "Email already exists" }, { status: 400 });
  }

  // パスワードハッシュ化
  const passwordHash = await hashPassword(password);

  // 認証トークン生成
  const verificationToken = generateVerificationToken();
  const verificationTokenExpiry = generateTokenExpiry();

  // ユーザー作成（型安全）
  const [newUser] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      verificationToken,
      verificationTokenExpiry,
    })
    .returning({ id: users.id, email: users.email });

  if (!newUser) {
    return Response.json({ error: "Failed to create user" }, { status: 500 });
  }

  // 認証メール送信
  const apiKey = context.cloudflare.env.RESEND_API_KEY;
  if (apiKey) {
    const baseUrl = new URL(request.url).origin;
    console.log("Attempting to send verification email to:", email);
    const emailResult = await sendVerificationEmail(
      { email, token: verificationToken, baseUrl },
      apiKey,
    );
    if (emailResult.success) {
      console.log("Verification email sent successfully");
    } else {
      console.error("Failed to send verification email:", emailResult.error);
    }
  } else {
    console.warn("RESEND_API_KEY is not set, skipping verification email");
  }

  // セッション作成（メール未認証でもログイン可能にする場合）
  const auth = createAuthService(context);
  const token = await auth.createSession({
    id: newUser.id,
    email: newUser.email,
  });

  // Cookie 設定
  const cookie = setCookie("auth_token", token);

  return Response.json(
    {
      success: true,
      user: newUser,
      message:
        "Registration successful. Please check your email to verify your account.",
    },
    { headers: { "Set-Cookie": cookie } },
  );
}

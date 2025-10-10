import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { ActionFunctionArgs } from "react-router";
import { createAuthService } from "~/features/auth/lib/auth-service";
import { sendVerificationEmail } from "~/features/auth/lib/email";
import { hashPassword } from "~/features/auth/lib/password";
import {
  generateTokenExpiry,
  generateVerificationToken,
} from "~/features/auth/lib/token";
import { users } from "~/features/auth/schema";
import { registerSchema } from "~/features/auth/validation";
import { setCookie } from "~/shared/lib/cookies";
import { AppError, errorResponse, formatZodError } from "~/shared/lib/errors";

export async function action({ request, context }: ActionFunctionArgs) {
  try {
    console.log("=== Register API called ===");
    const formData = await request.formData();
    const rawData = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

    // バリデーション
    const validation = registerSchema.safeParse(rawData);
    if (!validation.success) {
      throw formatZodError(validation.error);
    }

    const { email, password } = validation.data;
    console.log("Email:", email);
    console.log("Password length:", password.length);

    const db = drizzle(context.cloudflare.env.DB);

    // 既存ユーザーチェック
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .get();

    if (existingUser) {
      throw new AppError("Email already exists", 400);
    }

    // パスワードハッシュ化
    const passwordHash = await hashPassword(password);

    // 認証トークン生成
    const verificationToken = generateVerificationToken();
    const verificationTokenExpiry = generateTokenExpiry();

    // ユーザー作成
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
      throw new AppError("Failed to create user", 500);
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

    // セッション作成
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
  } catch (error) {
    return errorResponse(error);
  }
}

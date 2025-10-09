import * as z from "zod";
import { MIN_PASSWORD_LENGTH } from "./config.server";

/**
 * メールアドレスのバリデーションスキーマ
 */
export const emailSchema = z.email({ message: "Invalid email address" });

/**
 * パスワードのバリデーションスキーマ
 */
export const passwordSchema = z
  .string()
  .min(
    MIN_PASSWORD_LENGTH,
    `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
  );

/**
 * トークンのバリデーションスキーマ
 */
export const tokenSchema = z.string().min(1, "Token is required");

/**
 * ユーザー登録のバリデーションスキーマ
 */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

/**
 * ログインのバリデーションスキーマ
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

/**
 * トークン検証のバリデーションスキーマ
 */
export const verifyEmailSchema = z.object({
  token: tokenSchema,
});

/**
 * メール再送信のバリデーションスキーマ
 */
export const resendVerificationSchema = z.object({
  email: emailSchema,
});

/**
 * 型推論ヘルパー
 */
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;

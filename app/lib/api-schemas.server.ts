import * as z from "zod";

/**
 * エラーレスポンスのスキーマ
 */
export const errorResponseSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  message: z.string().optional(),
  details: z.unknown().optional(),
});

/**
 * 成功レスポンスのスキーマ
 */
export const successResponseSchema = z.object({
  success: z.literal(true),
  message: z.string().optional(),
});

/**
 * ユーザー情報のレスポンススキーマ
 */
export const userResponseSchema = z.object({
  id: z.number(),
  email: z.string().email(),
});

/**
 * 認証レスポンスのスキーマ
 */
export const authResponseSchema = z.object({
  success: z.literal(true),
  user: userResponseSchema,
  message: z.string().optional(),
});

/**
 * ログイン/登録レスポンスのスキーマ
 */
export const loginRegisterResponseSchema = authResponseSchema;

/**
 * メール認証レスポンスのスキーマ
 */
export const verifyEmailResponseSchema = successResponseSchema;

/**
 * メール再送信レスポンスのスキーマ
 */
export const resendVerificationResponseSchema = successResponseSchema.extend({
  message: z.string(),
});

/**
 * ユーザー情報取得レスポンスのスキーマ
 */
export const meResponseSchema = z.object({
  user: userResponseSchema,
});

/**
 * 型推論ヘルパー
 */
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type SuccessResponse = z.infer<typeof successResponseSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type MeResponse = z.infer<typeof meResponseSchema>;

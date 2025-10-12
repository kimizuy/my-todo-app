import * as z from "zod";

/**
 * アプリケーション全体の設定定数
 */

/**
 * メール認証トークンの有効期限（ミリ秒）
 * デフォルト: 24時間
 */
export const VERIFICATION_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000;

/**
 * パスワードリセットトークンの有効期限（ミリ秒）
 * デフォルト: 1時間
 */
export const PASSWORD_RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000;

/**
 * パスワードの最小文字数
 */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * メール送信のデフォルトfromアドレス
 * 本番環境では環境変数で上書き推奨
 */
export const DEFAULT_EMAIL_FROM = "onboarding@resend.dev";

/**
 * 設定値のバリデーションスキーマ
 */
const configSchema = z.object({
  VERIFICATION_TOKEN_EXPIRY_MS: z
    .number()
    .positive()
    .min(1000 * 60 * 5, "Token expiry must be at least 5 minutes"),
  MIN_PASSWORD_LENGTH: z
    .number()
    .int()
    .min(6, "Password length must be at least 6 characters")
    .max(128, "Password length must not exceed 128 characters"),
  DEFAULT_EMAIL_FROM: z.email({ message: "Invalid email address" }),
});

// 設定値のバリデーション（起動時チェック）
const validationResult = configSchema.safeParse({
  VERIFICATION_TOKEN_EXPIRY_MS,
  MIN_PASSWORD_LENGTH,
  DEFAULT_EMAIL_FROM,
});

if (!validationResult.success) {
  console.error("Configuration validation failed:", validationResult.error);
  throw new Error("Invalid configuration values");
}

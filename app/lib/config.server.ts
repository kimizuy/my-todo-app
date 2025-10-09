/**
 * アプリケーション全体の設定定数
 */

/**
 * メール認証トークンの有効期限（ミリ秒）
 * デフォルト: 24時間
 */
export const VERIFICATION_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000;

/**
 * パスワードの最小文字数
 */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * メール送信のデフォルトfromアドレス
 * 本番環境では環境変数で上書き推奨
 */
export const DEFAULT_EMAIL_FROM = "onboarding@resend.dev";

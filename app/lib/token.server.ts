/**
 * トークン生成と検証のユーティリティ
 */

/**
 * 暗号的に安全なランダムトークンを生成
 */
export function generateVerificationToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

/**
 * トークンの有効期限を生成（24時間後）
 */
export function generateTokenExpiry(): string {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24);
  return expiry.toISOString();
}

/**
 * トークンが有効期限内かチェック
 */
export function isTokenExpired(expiry: string | null): boolean {
  if (!expiry) return true;
  return new Date() > new Date(expiry);
}

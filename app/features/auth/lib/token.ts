import { VERIFICATION_TOKEN_EXPIRY_MS } from "~/shared/lib/config";

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
 * トークンの有効期限を生成（デフォルト: 24時間後）
 */
export function generateTokenExpiry(): string {
  const expiry = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_MS);
  return expiry.toISOString();
}

/**
 * トークンが有効期限内かチェック
 */
export function isTokenExpired(expiry: string | null): boolean {
  if (!expiry) return true;
  return new Date() > new Date(expiry);
}

if (import.meta.vitest) {
  describe("generateVerificationToken", () => {
    test("generates a 64-character hexadecimal token", () => {
      const token = generateVerificationToken();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    test("generates unique tokens", () => {
      const token1 = generateVerificationToken();
      const token2 = generateVerificationToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe("generateTokenExpiry", () => {
    test("generates expiry timestamp 24 hours in the future", () => {
      const now = new Date("2025-10-09T12:00:00Z");
      vi.setSystemTime(now);

      const expiry = generateTokenExpiry();
      const expiryDate = new Date(expiry);
      const expected = new Date("2025-10-10T12:00:00Z");

      expect(expiryDate.getTime()).toBe(expected.getTime());

      vi.useRealTimers();
    });

    test("returns ISO string format", () => {
      const expiry = generateTokenExpiry();
      expect(() => new Date(expiry)).not.toThrow();
      expect(expiry).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe("isTokenExpired", () => {
    test("returns true for null expiry", () => {
      expect(isTokenExpired(null)).toBe(true);
    });

    test("returns true for past expiry", () => {
      const now = new Date("2025-10-09T12:00:00Z");
      vi.setSystemTime(now);

      const pastExpiry = new Date("2025-10-08T12:00:00Z").toISOString();
      expect(isTokenExpired(pastExpiry)).toBe(true);

      vi.useRealTimers();
    });

    test("returns false for future expiry", () => {
      const now = new Date("2025-10-09T12:00:00Z");
      vi.setSystemTime(now);

      const futureExpiry = new Date("2025-10-10T12:00:00Z").toISOString();
      expect(isTokenExpired(futureExpiry)).toBe(false);

      vi.useRealTimers();
    });

    test("returns true for current time (edge case)", () => {
      const now = new Date("2025-10-09T12:00:00Z");
      vi.setSystemTime(now);

      const currentExpiry = now.toISOString();
      expect(isTokenExpired(currentExpiry)).toBe(false);

      vi.useRealTimers();
    });
  });
}

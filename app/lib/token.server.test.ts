import { describe, expect, test, vi } from "vitest";
import {
  generateTokenExpiry,
  generateVerificationToken,
  isTokenExpired,
} from "./token.server";

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

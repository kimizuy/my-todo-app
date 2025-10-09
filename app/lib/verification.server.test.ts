import { describe, expect, test, vi } from "vitest";
import { InvalidTokenError } from "./errors.server";
import { markEmailAsVerified, verifyEmailToken } from "./verification.server";

describe("verifyEmailToken", () => {
  test("throws InvalidTokenError for non-existent token", async () => {
    const mockDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            get: vi.fn().mockResolvedValue(null),
          }),
        }),
      }),
    };

    await expect(
      // biome-ignore lint/suspicious/noExplicitAny: mock type for testing
      verifyEmailToken("invalid-token", mockDb as any),
    ).rejects.toThrow(InvalidTokenError);
  });

  test("throws InvalidTokenError for expired token", async () => {
    const mockUser = {
      id: 1,
      email: "test@example.com",
      verificationToken: "valid-token",
      verificationTokenExpiry: new Date(
        Date.now() - 1000 * 60 * 60,
      ).toISOString(), // 1 hour ago
      emailVerified: false,
    };

    const mockDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            get: vi.fn().mockResolvedValue(mockUser),
          }),
        }),
      }),
    };

    await expect(
      // biome-ignore lint/suspicious/noExplicitAny: mock type for testing
      verifyEmailToken("valid-token", mockDb as any),
    ).rejects.toThrow(InvalidTokenError);
  });

  test("returns user for valid token", async () => {
    const mockUser = {
      id: 1,
      email: "test@example.com",
      verificationToken: "valid-token",
      verificationTokenExpiry: new Date(
        Date.now() + 1000 * 60 * 60,
      ).toISOString(), // 1 hour from now
      emailVerified: false,
    };

    const mockDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            get: vi.fn().mockResolvedValue(mockUser),
          }),
        }),
      }),
    };

    // biome-ignore lint/suspicious/noExplicitAny: mock type for testing
    const result = await verifyEmailToken("valid-token", mockDb as any);
    expect(result).toEqual(mockUser);
  });
});

describe("markEmailAsVerified", () => {
  test("updates user email verification status", async () => {
    const mockUpdate = vi.fn().mockResolvedValue(undefined);
    const mockDb = {
      update: () => ({
        set: () => ({
          where: mockUpdate,
        }),
      }),
    };

    // biome-ignore lint/suspicious/noExplicitAny: mock type for testing
    await markEmailAsVerified(1, mockDb as any);
    expect(mockUpdate).toHaveBeenCalled();
  });
});

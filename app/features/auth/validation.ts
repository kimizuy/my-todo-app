import * as z from "zod";
import { MIN_PASSWORD_LENGTH } from "~/features/auth/lib/config";

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
 * パスワード忘れのバリデーションスキーマ
 */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

/**
 * パスワードリセットのバリデーションスキーマ
 */
export const resetPasswordSchema = z
  .object({
    token: tokenSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/**
 * 型推論ヘルパー
 */
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

if (import.meta.vitest) {
  describe("emailSchema", () => {
    test("accepts valid email addresses", () => {
      const validEmails = [
        "test@example.com",
        "user.name@example.com",
        "user+tag@example.co.jp",
      ];

      for (const email of validEmails) {
        const result = emailSchema.safeParse(email);
        expect(result.success).toBe(true);
      }
    });

    test("rejects invalid email addresses", () => {
      const invalidEmails = ["", "invalid", "invalid@", "@example.com", "a@b"];

      for (const email of invalidEmails) {
        const result = emailSchema.safeParse(email);
        expect(result.success).toBe(false);
      }
    });
  });

  describe("passwordSchema", () => {
    test("accepts valid passwords (8+ characters)", () => {
      const validPasswords = ["password123", "12345678", "a".repeat(100)];

      for (const password of validPasswords) {
        const result = passwordSchema.safeParse(password);
        expect(result.success).toBe(true);
      }
    });

    test("rejects passwords shorter than 8 characters", () => {
      const invalidPasswords = ["", "1234567", "short"];

      for (const password of invalidPasswords) {
        const result = passwordSchema.safeParse(password);
        expect(result.success).toBe(false);
      }
    });
  });

  describe("tokenSchema", () => {
    test("accepts non-empty strings", () => {
      const validTokens = ["abc123", "token", "a".repeat(100)];

      for (const token of validTokens) {
        const result = tokenSchema.safeParse(token);
        expect(result.success).toBe(true);
      }
    });

    test("rejects empty strings", () => {
      const result = tokenSchema.safeParse("");
      expect(result.success).toBe(false);
    });
  });

  describe("registerSchema", () => {
    test("accepts valid registration data", () => {
      const validData = {
        email: "test@example.com",
        password: "password123",
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test("rejects invalid email", () => {
      const invalidData = {
        email: "invalid-email",
        password: "password123",
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    test("rejects invalid password", () => {
      const invalidData = {
        email: "test@example.com",
        password: "short",
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    test("rejects missing fields", () => {
      const result1 = registerSchema.safeParse({ email: "test@example.com" });
      expect(result1.success).toBe(false);

      const result2 = registerSchema.safeParse({ password: "password123" });
      expect(result2.success).toBe(false);
    });
  });

  describe("loginSchema", () => {
    test("accepts valid login data", () => {
      const validData = {
        email: "test@example.com",
        password: "password123",
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test("rejects invalid email", () => {
      const invalidData = {
        email: "invalid-email",
        password: "password123",
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    test("rejects missing password", () => {
      const invalidData = {
        email: "test@example.com",
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
}

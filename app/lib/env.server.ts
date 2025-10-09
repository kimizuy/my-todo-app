import * as z from "zod";

/**
 * 環境変数のバリデーションスキーマ
 */
const envSchema = z.object({
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
  DB: z.custom<D1Database>((val) => val !== undefined, {
    message: "DB binding is required",
  }),
});

/**
 * 環境変数の型
 */
export type Env = z.infer<typeof envSchema>;

/**
 * 環境変数をバリデーションして返す
 * 不正な環境変数の場合はエラーをスローする
 */
export function validateEnv(env: unknown): Env {
  try {
    return envSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((issue) => {
        return `${issue.path.join(".")}: ${issue.message}`;
      });
      throw new Error(`Environment validation failed:\n${issues.join("\n")}`);
    }
    throw error;
  }
}

/**
 * 環境変数を取得（バリデーション済み）
 */
export function getEnv(env: unknown): Env {
  return validateEnv(env);
}

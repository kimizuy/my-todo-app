import { eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { InvalidTokenError } from "~/shared/utils/errors";
import type { User } from "../schema";
import { users } from "../schema";
import { isTokenExpired } from "./token";

/**
 * トークンでユーザーを検証し、有効性をチェック
 */
export async function verifyEmailToken(
  token: string,
  db: DrizzleD1Database,
): Promise<User> {
  // トークンでユーザーを検索
  const user = await db
    .select()
    .from(users)
    .where(eq(users.verificationToken, token))
    .get();

  if (!user) {
    throw new InvalidTokenError("Invalid token");
  }

  // トークンの有効期限チェック
  if (isTokenExpired(user.verificationTokenExpiry)) {
    throw new InvalidTokenError("Token has expired");
  }

  return user;
}

/**
 * メール認証完了処理
 */
export async function markEmailAsVerified(
  userId: number,
  db: DrizzleD1Database,
): Promise<void> {
  await db
    .update(users)
    .set({
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiry: null,
    })
    .where(eq(users.id, userId));
}

/**
 * 新しい認証トークンを生成してDBに保存
 */
export async function regenerateVerificationToken(
  userId: number,
  token: string,
  expiry: string,
  db: DrizzleD1Database,
): Promise<void> {
  await db
    .update(users)
    .set({
      verificationToken: token,
      verificationTokenExpiry: expiry,
    })
    .where(eq(users.id, userId));
}

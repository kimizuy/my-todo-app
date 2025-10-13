import { eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { PASSWORD_RESET_TOKEN_EXPIRY_MS } from "~/features/auth/config";
import { InvalidTokenError } from "~/shared/utils/errors";
import { sendEmail } from "../email/send";
import { getPasswordResetEmailTemplate } from "../email/templates";
import { passwordResetTokens, users } from "../schema";
import { generateVerificationToken, isTokenExpired } from "../session/token";
import { hashPassword } from "./hash";

/**
 * パスワードリセットトークンの有効期限を生成
 */
function generateResetTokenExpiry(): string {
  const expiry = new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRY_MS);
  return expiry.toISOString();
}

/**
 * パスワードリセットをリクエスト
 * トークンを生成してDBに保存し、リセットメールを送信
 */
export async function requestPasswordReset(
  email: string,
  origin: string,
  apiKey: string,
  db: DrizzleD1Database,
): Promise<void> {
  // ユーザーを検索
  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .get();

  // セキュリティ: ユーザーが存在しない場合もエラーを返さない（タイミング攻撃対策）
  if (!user) {
    return;
  }

  // パスワードハッシュが設定されていない場合（パスキーのみのユーザー）
  if (!user.passwordHash) {
    // パスキーのみのユーザーにはパスワードリセットを提供しない
    return;
  }

  // トークンを生成
  const token = generateVerificationToken();
  const expiresAt = generateResetTokenExpiry();

  // 既存のトークンを削除して新しいトークンを保存
  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.userId, user.id));

  await db.insert(passwordResetTokens).values({
    userId: user.id,
    token,
    expiresAt,
  });

  // リセットメールを送信
  const resetUrl = `${origin}/reset-password?token=${token}`;
  const emailTemplate = await getPasswordResetEmailTemplate({ resetUrl });

  await sendEmail(
    {
      to: user.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    },
    apiKey,
  );
}

/**
 * パスワードリセットトークンを検証
 */
export async function verifyResetToken(
  token: string,
  db: DrizzleD1Database,
): Promise<{ userId: number; email: string }> {
  // トークンでレコードを検索
  const resetToken = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.token, token))
    .get();

  if (!resetToken) {
    throw new InvalidTokenError("Invalid or expired token");
  }

  // トークンの有効期限チェック
  if (isTokenExpired(resetToken.expiresAt)) {
    // 期限切れのトークンを削除
    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.id, resetToken.id));
    throw new InvalidTokenError("Invalid or expired token");
  }

  // ユーザー情報を取得
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, resetToken.userId))
    .get();

  if (!user) {
    throw new InvalidTokenError("Invalid or expired token");
  }

  return {
    userId: user.id,
    email: user.email,
  };
}

/**
 * パスワードをリセット
 * 新しいパスワードを設定し、トークンを削除
 */
export async function resetPassword(
  token: string,
  newPassword: string,
  db: DrizzleD1Database,
): Promise<void> {
  // トークンを検証
  const { userId } = await verifyResetToken(token, db);

  // パスワードをハッシュ化
  const passwordHash = await hashPassword(newPassword);

  // パスワードを更新
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));

  // 使用済みトークンを削除
  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.token, token));
}

import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// ユーザーテーブル
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  verificationToken: text("verification_token"),
  verificationTokenExpiry: text("verification_token_expiry"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// TypeScript 型をエクスポート
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

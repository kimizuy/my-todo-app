import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// ユーザーテーブル
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"), // パスキーのみのユーザーに対応するためオプショナル
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

// パスキー（WebAuthn credentials）テーブル
export const passkeys = sqliteTable("passkeys", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  credentialId: text("credential_id").notNull().unique(),
  publicKey: text("public_key").notNull(),
  counter: integer("counter").notNull().default(0),
  transports: text("transports"), // JSON配列: ["usb", "nfc", "ble", "internal"]
  aaguid: text("aaguid"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  lastUsedAt: text("last_used_at"),
});

export type Passkey = typeof passkeys.$inferSelect;
export type NewPasskey = typeof passkeys.$inferInsert;

// WebAuthnチャレンジの一時保存テーブル
export const webauthnChallenges = sqliteTable("webauthn_challenges", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  challenge: text("challenge").notNull(),
  userId: integer("user_id").references(() => users.id, {
    onDelete: "cascade",
  }),
  type: text("type").notNull(), // "registration" | "authentication"
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  expiresAt: text("expires_at").notNull(),
});

export type WebauthnChallenge = typeof webauthnChallenges.$inferSelect;
export type NewWebauthnChallenge = typeof webauthnChallenges.$inferInsert;

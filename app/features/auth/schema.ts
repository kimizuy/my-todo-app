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
  // OAuth関連
  googleId: text("google_id").unique(), // Google固有のユーザーID
  provider: text("provider").notNull().default("password"), // "password" | "google" | "passkey"
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

// パスワードリセットトークンテーブル
export const passwordResetTokens = sqliteTable("password_reset_tokens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert;

// OAuth state管理テーブル
export const oauthStates = sqliteTable("oauth_states", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  state: text("state").notNull().unique(),
  codeVerifier: text("code_verifier").notNull(),
  provider: text("provider").notNull(), // "google"
  redirectTo: text("redirect_to"), // 認証後のリダイレクト先（オプション）
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  expiresAt: text("expires_at").notNull(),
});

export type OAuthState = typeof oauthStates.$inferSelect;
export type NewOAuthState = typeof oauthStates.$inferInsert;

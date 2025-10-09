import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const COLUMN_IDS = [
  "uncategorized",
  "do-today",
  "do-not-today",
  "done",
] as const;

// ユーザーテーブル
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// タスクテーブル
export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  columnId: text("column_id", {
    enum: COLUMN_IDS,
  }).notNull(),
  createdAt: text("created_at").notNull(),
  order: integer("order").notNull().default(0),
});

// アーカイブテーブル
export const archivedTasks = sqliteTable("archived_tasks", {
  id: text("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  columnId: text("column_id", {
    enum: COLUMN_IDS,
  }).notNull(),
  createdAt: text("created_at").notNull(),
  archivedAt: text("archived_at").notNull(),
  order: integer("order").notNull().default(0),
});

// TypeScript 型をエクスポート
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type ArchivedTask = typeof archivedTasks.$inferSelect;
export type NewArchivedTask = typeof archivedTasks.$inferInsert;
export type ColumnId = (typeof COLUMN_IDS)[number];

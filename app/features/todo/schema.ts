import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "../auth/schema";

export const COLUMN_IDS = [
  "uncategorized",
  "do-today",
  "do-not-today",
  "done",
] as const;

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
  archivedAt: text("archived_at"),
  order: integer("order").notNull().default(0),
});

// TypeScript 型をエクスポート
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type ColumnId = (typeof COLUMN_IDS)[number];

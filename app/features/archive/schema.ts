import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "../auth/schema";
import { COLUMN_IDS } from "../todo/schema";

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
export type ArchivedTask = typeof archivedTasks.$inferSelect;
export type NewArchivedTask = typeof archivedTasks.$inferInsert;

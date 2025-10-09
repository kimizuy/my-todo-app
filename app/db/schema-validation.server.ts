import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import * as z from "zod";
import { archivedTasks, tasks, users } from "./schema";

const COLUMN_IDS = [
  "uncategorized",
  "do-today",
  "do-not-today",
  "done",
] as const;

/**
 * カラムIDのzodスキーマ
 */
export const columnIdSchema = z.enum(COLUMN_IDS);

// Zod スキーマをエクスポート
/**
 * ユーザー挿入のバリデーションスキーマ
 */
export const insertUserSchema = createInsertSchema(users);

/**
 * ユーザー選択のバリデーションスキーマ
 */
export const selectUserSchema = createSelectSchema(users);

/**
 * タスク挿入のバリデーションスキーマ
 */
export const insertTaskSchema = createInsertSchema(tasks, {
  columnId: columnIdSchema,
});

/**
 * タスク選択のバリデーションスキーマ
 */
export const selectTaskSchema = createSelectSchema(tasks, {
  columnId: columnIdSchema,
});

/**
 * アーカイブタスク挿入のバリデーションスキーマ
 */
export const insertArchivedTaskSchema = createInsertSchema(archivedTasks, {
  columnId: columnIdSchema,
});

/**
 * アーカイブタスク選択のバリデーションスキーマ
 */
export const selectArchivedTaskSchema = createSelectSchema(archivedTasks, {
  columnId: columnIdSchema,
});

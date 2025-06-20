export type ColumnId = "uncategorized" | "do-today" | "do-not-today" | "done";

export interface Task {
  id: string;
  content: string;
  columnId: ColumnId;
  createdAt: string;
  archivedAt?: string;
}

export const COLUMNS = [
  { id: "uncategorized", title: "未分類" },
  { id: "do-today", title: "今日やる" },
  { id: "do-not-today", title: "今日やらない" },
  { id: "done", title: "完了" },
] as const;

export function isColumnId(value: unknown): value is ColumnId {
  return (
    typeof value === "string" && COLUMNS.some((column) => column.id === value)
  );
}

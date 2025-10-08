import { arrayMove } from "@dnd-kit/sortable";
import type { ColumnId, Task } from "~/db/schema";

const COLUMN_IDS = new Set<ColumnId>([
  "uncategorized",
  "do-today",
  "do-not-today",
  "done",
]);

export function isColumnId(value: unknown): value is ColumnId {
  return typeof value === "string" && COLUMN_IDS.has(value as ColumnId);
}

export function findTaskById(tasks: Task[], taskId: string): Task | undefined {
  return tasks.find((task) => task.id === taskId);
}

export function getTasksByColumn(tasks: Task[], columnId: ColumnId): Task[] {
  return tasks.filter((task) => task.columnId === columnId);
}

export function getMaxOrderInColumn(tasks: Task[], columnId: ColumnId): number {
  const columnTasks = getTasksByColumn(tasks, columnId);
  return columnTasks.reduce((max, task) => Math.max(max, task.order), -1);
}

export function reorderTasksInColumn(
  tasks: Task[],
  oldIndex: number,
  newIndex: number,
): Task[] {
  const reordered = arrayMove(tasks, oldIndex, newIndex);

  return reordered.map((task, index) => {
    // order値が変わらない場合は同じ参照を返す（パフォーマンス最適化）
    if (task.order === index) {
      return task;
    }
    return {
      ...task,
      order: index,
    };
  });
}

export function moveTaskToColumn(
  tasks: Task[],
  taskId: string,
  targetColumnId: ColumnId,
): Task[] {
  const maxOrder = getMaxOrderInColumn(tasks, targetColumnId);

  return tasks.map((task) =>
    task.id === taskId
      ? { ...task, columnId: targetColumnId, order: maxOrder + 1 }
      : task,
  );
}

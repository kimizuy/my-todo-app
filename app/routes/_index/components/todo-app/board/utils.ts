import { arrayMove } from "@dnd-kit/sortable";
import type { ColumnId, Task } from "~/db/schema";

const COLUMN_ID_SET = new Set<ColumnId>([
  "uncategorized",
  "do-today",
  "do-not-today",
  "done",
]);

export function isColumnId(value: unknown): value is ColumnId {
  return typeof value === "string" && COLUMN_ID_SET.has(value as ColumnId);
}

export function findTaskById(tasks: Task[], taskId: string): Task | undefined {
  return tasks.find((task) => task.id === taskId);
}

export function getTasksByColumn(tasks: Task[], columnId: ColumnId): Task[] {
  return tasks.filter((task) => task.columnId === columnId);
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
  let maxOrder = -1;
  let targetTaskIndex = -1;

  // 1回のループでmaxOrderの計算と対象タスクの検索を同時に行う
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    if (task.columnId === targetColumnId && task.order > maxOrder) {
      maxOrder = task.order;
    }
    if (task.id === taskId) {
      targetTaskIndex = i;
    }
  }

  // 対象タスクが見つからない場合は元の配列を返す
  if (targetTaskIndex === -1) {
    return tasks;
  }

  // 配列をコピーして、該当タスクのみ更新
  const result = [...tasks];
  result[targetTaskIndex] = {
    ...tasks[targetTaskIndex],
    columnId: targetColumnId,
    order: maxOrder + 1,
  };

  return result;
}

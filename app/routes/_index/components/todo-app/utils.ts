import type { Task } from "./types";

// タスクリストにcreatedAtを追加し、必要に応じてlocalStorageを保存する関数
// 主にcreatedAtがない古いデータを更新するために使用する
export function updateTasksWithCreatedAt(
  originalTasks: Task[],
  storageKey: string,
): Task[] {
  // 古いデータにcreatedAtを追加
  const tasksWithCreatedAt = originalTasks.map((task) => ({
    ...task,
    createdAt: task.createdAt || task.archivedAt || new Date().toISOString(),
  }));

  // createdAtを追加した場合はlocalStorageを更新
  const hasUpdatedTasks = tasksWithCreatedAt.some(
    (task, index) => task.createdAt !== originalTasks[index]?.createdAt,
  );

  if (hasUpdatedTasks) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(tasksWithCreatedAt));
    } catch (error) {
      console.error(`${storageKey}の保存に失敗しました:`, error);
    }
  }

  return tasksWithCreatedAt;
}

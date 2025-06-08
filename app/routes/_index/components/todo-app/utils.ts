import type { Task } from ".";

// タスクリストにcreatedAtを追加し、必要に応じてlocalStorageを保存する関数
// 主にcreatedAtがない古いデータを更新するために使用する
export function updateTasksWithCreatedAt(
  originalTasks: Task[],
  storageKey: string,
  fallbackDate?: string,
): Task[] {
  // 古いデータにcreatedAtを追加
  const tasksWithCreatedAt = originalTasks.map((task) => ({
    ...task,
    createdAt:
      task.createdAt ||
      fallbackDate ||
      task.archivedAt ||
      new Date().toISOString(),
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

// タスクを新しい順（createdAt降順）でソートする共通関数
export function sortTasksByCreatedAt(tasks: Task[]): Task[] {
  return tasks.sort((a, b) => {
    // createdAtの降順（新しいタスクが上）でソート
    const aCreatedAt = new Date(a.createdAt || 0).getTime();
    const bCreatedAt = new Date(b.createdAt || 0).getTime();

    if (aCreatedAt !== bCreatedAt) {
      return bCreatedAt - aCreatedAt; // 降順
    }

    // createdAtが同じ場合はidでソート
    return b.id.localeCompare(a.id);
  });
}

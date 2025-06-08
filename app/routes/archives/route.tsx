import type { Task } from "../_index/components/todo-app";
import type { Route } from "./+types/route";
import { useState, useEffect } from "react";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "アーカイブ - Daily Tasks" },
    { name: "description", content: "Manage your daily tasks effectively!" },
  ];
}

export default function Archives() {
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(function initializeClient() {
    setIsClient(true);
  }, []);

  useEffect(
    function loadArchivedTasksFromLocalStorage() {
      if (!isClient) return;

      const storedArchivedTasks = localStorage.getItem("archivedTasks");
      if (storedArchivedTasks) {
        try {
          const parsedTasks: Task[] = JSON.parse(storedArchivedTasks);

          // 古いアーカイブタスクにcreatedAtがない場合はarchivedAtを使用
          const tasksWithCreatedAt = parsedTasks.map((task) => ({
            ...task,
            createdAt:
              task.createdAt || task.archivedAt || new Date().toISOString(),
          }));

          setArchivedTasks(tasksWithCreatedAt.reverse()); // 最新のものを上に表示

          // createdAtを追加した場合はlocalStorageを更新
          const hasUpdatedTasks = tasksWithCreatedAt.some(
            (task, index) => task.createdAt !== parsedTasks[index]?.createdAt,
          );

          if (hasUpdatedTasks) {
            localStorage.setItem(
              "archivedTasks",
              JSON.stringify(tasksWithCreatedAt.reverse()),
            );
          }
        } catch (error) {
          console.error(
            "アーカイブされたタスクの読み込みに失敗しました:",
            error,
          );
          setArchivedTasks([]);
        }
      }
    },
    [isClient],
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateOnly = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
  };

  // アーカイブ日付でグループ化
  const groupedTasks = archivedTasks.reduce(
    (groups, task) => {
      if (!task.archivedAt) return groups;

      const archiveDate = formatDateOnly(task.archivedAt);
      if (!groups[archiveDate]) {
        groups[archiveDate] = [];
      }
      groups[archiveDate].push(task);
      return groups;
    },
    {} as Record<string, Task[]>,
  );

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-3xl font-bold">アーカイブ</h1>

      {archivedTasks.length === 0 ? (
        <div className="text-muted-foreground py-8 text-center">
          アーカイブされたタスクはありません
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTasks)
            .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
            .map(([archiveDate, tasks]) => (
              <div key={archiveDate}>
                <h2 className="text-muted-foreground bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 mb-3 py-2 text-sm font-semibold backdrop-blur">
                  {archiveDate}にアーカイブ
                </h2>
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-muted/50 rounded-lg border p-4"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="text-sm font-medium">
                          {task.content}
                        </div>
                        {task.createdAt && (
                          <time className="text-muted-foreground text-xs">
                            {formatDate(task.createdAt)}
                          </time>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

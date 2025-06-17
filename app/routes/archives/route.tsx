import type { Task } from "../_index/components/todo-app";
import { updateTasksWithCreatedAt } from "../_index/components/todo-app/utils";
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
  const [expandedArchives, setExpandedArchives] = useState<Set<string>>(
    new Set(),
  );
  const [isInitialized, setIsInitialized] = useState(false);

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
          const tasksWithCreatedAt = updateTasksWithCreatedAt(
            parsedTasks,
            "archivedTasks",
          );
          setArchivedTasks(tasksWithCreatedAt.reverse()); // 最新のものを上に表示
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

  // 各グループ内のタスクをcreatedAtの降順（新しいタスクが上）でソート
  for (const date in groupedTasks) {
    groupedTasks[date] = sortTasksByCreatedAt(groupedTasks[date]);
  }

  useEffect(
    function initializeExpandedArchives() {
      if (!isInitialized && Object.keys(groupedTasks).length > 0) {
        const sortedArchiveDates = Object.keys(groupedTasks).sort(
          (a, b) => new Date(b).getTime() - new Date(a).getTime(),
        );

        if (sortedArchiveDates.length > 0) {
          setExpandedArchives(new Set([sortedArchiveDates[0]]));
          setIsInitialized(true);
        }
      }
    },
    [groupedTasks, isInitialized],
  );

  const toggleArchive = (archiveDate: string) => {
    setExpandedArchives((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(archiveDate)) {
        newSet.delete(archiveDate);
      } else {
        newSet.add(archiveDate);
      }
      return newSet;
    });
  };

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
            .map(([archiveDate, tasks]) => {
              const isExpanded = expandedArchives.has(archiveDate);
              return (
                <div key={archiveDate}>
                  <button
                    type="button"
                    onClick={() => toggleArchive(archiveDate)}
                    className="text-muted-foreground bg-background/95 supports-[backdrop-filter]:bg-background/60 hover:text-foreground sticky top-0 mb-3 flex w-full items-center gap-2 py-2 text-left text-sm font-semibold backdrop-blur transition-colors"
                  >
                    <span className="transform transition-transform duration-200">
                      {isExpanded ? "▼" : "▶"}
                    </span>
                    {archiveDate}にアーカイブ ({tasks.length}件)
                  </button>
                  {isExpanded && (
                    <div className="space-y-3">
                      {tasks.map((task) => (
                        <div
                          key={task.id}
                          className="bg-muted/50 rounded-lg border p-4"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0 flex-1 text-sm font-medium">
                              {task.content}
                            </div>
                            {task.createdAt && (
                              <time className="text-muted-foreground text-xs whitespace-nowrap">
                                {formatDate(task.createdAt)}
                              </time>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

function sortTasksByCreatedAt(tasks: Task[]): Task[] {
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

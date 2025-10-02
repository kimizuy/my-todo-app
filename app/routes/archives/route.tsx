import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDate } from "~/lib/utils";
import type { Task } from "../_index/components/todo-app/types";
import {
  parseTaskContent,
  updateTasksWithCreatedAt,
} from "../_index/components/todo-app/utils";
import type { Route } from "./+types/route";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "アーカイブ - Daily Tasks" },
    { name: "description", content: "Manage your daily tasks effectively!" },
  ];
}

export default function Archives() {
  const archivedTasks = useArchivedTasks();

  // アーカイブ日付でグループ化
  const tasksByArchivedDate = useMemo(() => {
    const groups = archivedTasks.reduce(
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
    for (const date in groups) {
      groups[date] = sortTasksByCreatedAt(groups[date]);
    }

    return groups;
  }, [archivedTasks]);

  const { expandedArchives, toggle, expandAll, collapseAll } =
    useExpandedArchives(tasksByArchivedDate);

  const sortedArchiveEntries = useMemo(
    () =>
      Object.entries(tasksByArchivedDate).sort(
        ([a], [b]) => new Date(b).getTime() - new Date(a).getTime(),
      ),
    [tasksByArchivedDate],
  );

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-3xl font-bold">アーカイブ</h1>

      {archivedTasks.length > 0 &&
        Object.keys(tasksByArchivedDate).length > 1 && (
          <div className="mb-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={expandAll}
              className="hover:bg-muted rounded-md border px-3 py-1 text-sm transition-colors"
            >
              すべて開く
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="hover:bg-muted rounded-md border px-3 py-1 text-sm transition-colors"
            >
              すべて閉じる
            </button>
          </div>
        )}

      {archivedTasks.length === 0 ? (
        <div className="text-muted-foreground py-8 text-center">
          アーカイブされたタスクはありません
        </div>
      ) : (
        <div className="space-y-6">
          {sortedArchiveEntries.map(([archiveDate, tasks]) => {
            const isExpanded = expandedArchives.has(archiveDate);
            return (
              <div key={archiveDate}>
                <button
                  type="button"
                  onClick={() => toggle(archiveDate)}
                  className="text-muted-foreground bg-background/95 supports-[backdrop-filter]:bg-background/60 hover:text-foreground sticky top-0 mb-3 flex w-full cursor-pointer items-center gap-2 py-2 text-left text-sm font-semibold backdrop-blur transition-colors"
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
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <ArchivedTaskContent task={task} />
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

interface ArchivedTaskContentProps {
  task: Task;
}

function ArchivedTaskContent({ task }: ArchivedTaskContentProps) {
  const parsedContent = useMemo(() => {
    return parseTaskContent(task.content);
  }, [task.content]);

  return (
    <div
      className="prose dark:prose-invert text-primary prose-p:text-primary prose-headings:text-primary prose-li:text-primary prose-strong:text-primary prose-em:text-primary prose-a:text-primary text-sm wrap-anywhere"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: Content is sanitized with DOMPurify
      dangerouslySetInnerHTML={{ __html: parsedContent }}
    />
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

const formatDateOnly = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
};

function useArchivedTasks() {
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

  return archivedTasks;
}

function useExpandedArchives(groupedTasks: Record<string, Task[]>) {
  const [expandedArchives, setExpandedArchives] = useState<Set<string>>(
    new Set(),
  );
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(
    function initializeExpandedArchives() {
      // すでに初期化済みの場合や、グループ化されたタスクがない場合は何もしない
      if (isInitialized || Object.keys(groupedTasks).length === 0) {
        return;
      }

      const sortedArchiveDates = Object.keys(groupedTasks).sort(
        (a, b) => new Date(b).getTime() - new Date(a).getTime(),
      );

      if (sortedArchiveDates.length > 0) {
        setExpandedArchives(new Set([sortedArchiveDates[0]]));
        setIsInitialized(true);
      }
    },
    [groupedTasks, isInitialized],
  );

  const toggle = useCallback((archiveDate: string) => {
    setExpandedArchives((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(archiveDate)) {
        newSet.delete(archiveDate);
      } else {
        newSet.add(archiveDate);
      }
      return newSet;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedArchives(new Set(Object.keys(groupedTasks)));
  }, [groupedTasks]);

  const collapseAll = useCallback(() => {
    setExpandedArchives(new Set());
  }, []);

  return { expandedArchives, toggle, expandAll, collapseAll };
}

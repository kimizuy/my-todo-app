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
          const parsedTasks = JSON.parse(storedArchivedTasks);
          setArchivedTasks(parsedTasks.reverse()); // 最新のものを上に表示
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

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-3xl font-bold">アーカイブ</h1>

      {archivedTasks.length === 0 ? (
        <div className="text-muted-foreground py-8 text-center">
          アーカイブされたタスクはありません
        </div>
      ) : (
        <div className="space-y-4">
          {archivedTasks.map((task) => (
            <div key={task.id} className="bg-muted/50 rounded-lg border p-4">
              <div className="flex justify-between">
                <p className="text-sm font-medium">{task.content}</p>
                <time className="text-muted-foreground ml-4 text-xs">
                  {task.archivedAt && formatDate(task.archivedAt)}
                </time>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

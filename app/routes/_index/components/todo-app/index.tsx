import { useCallback, useMemo, useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import type { Task } from "~/db/schema";
import { Board } from "./board";
import { Filter } from "./filter";
import { useTasks } from "./hooks";
import { InputForm } from "./input-form";

export function TodoApp() {
  const { tasks, setTasks, fetcher } = useTasks();
  const [filterText, setFilterText] = useState<string>("");

  const handleAddTaskFromForm = useCallback(
    (content: string) => {
      const newTask: Task = {
        id: `task-${Date.now()}`,
        userId: 0, // サーバーからの応答で正しいuserIdに更新される
        content,
        columnId: "uncategorized",
        createdAt: new Date().toISOString(),
      };

      // 楽観的更新
      setTasks((prev) => [newTask, ...prev]);

      // サーバーに送信
      const formData = new FormData();
      formData.append("intent", "create");
      formData.append("content", content);
      fetcher.submit(formData, { method: "post" });
    },
    [setTasks, fetcher],
  );

  const handleResetTasks = useCallback(() => {
    setTasks((prevTasks) => {
      // 今日やる/やらないのタスクを分類
      const doTodayTasks = prevTasks.filter(
        (task) => task.columnId === "do-today",
      );
      const doNotTodayTasks = prevTasks.filter(
        (task) => task.columnId === "do-not-today",
      );
      const otherTasks = prevTasks.filter(
        (task) =>
          task.columnId !== "do-today" && task.columnId !== "do-not-today",
      );

      // リセット対象のタスクを未分類に変更し、指定された順序で配置
      const resetDoTodayTasks = doTodayTasks.map((task) => ({
        ...task,
        columnId: "uncategorized" as const,
      }));
      const resetDoNotTodayTasks = doNotTodayTasks.map((task) => ({
        ...task,
        columnId: "uncategorized" as const,
      }));

      // 他のタスクの中の未分類タスクを分離
      const uncategorizedTasks = otherTasks.filter(
        (task) => task.columnId === "uncategorized",
      );
      const nonUncategorizedTasks = otherTasks.filter(
        (task) => task.columnId !== "uncategorized",
      );

      // 最終的な順序: 非未分類 + 今日やる + 今日やらない + 既存の未分類
      return [
        ...nonUncategorizedTasks,
        ...resetDoTodayTasks,
        ...resetDoNotTodayTasks,
        ...uncategorizedTasks,
      ];
    });
  }, [setTasks]);

  const handleDeleteTask = useCallback(
    (taskId: string) => {
      // 楽観的更新
      setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));

      // サーバーに送信
      const formData = new FormData();
      formData.append("intent", "delete");
      formData.append("taskId", taskId);
      fetcher.submit(formData, { method: "post" });
    },
    [setTasks, fetcher],
  );

  const handleCompleteTask = useCallback(
    (taskId: string) => {
      // 楽観的更新
      setTasks((prevTasks) => {
        const taskToComplete = prevTasks.find((task) => task.id === taskId);
        if (!taskToComplete) return prevTasks;

        const tasksWithoutCompleted = prevTasks.filter(
          (task) => task.id !== taskId,
        );

        const completedTask: Task = { ...taskToComplete, columnId: "done" };
        return [completedTask, ...tasksWithoutCompleted];
      });

      // サーバーに送信
      const formData = new FormData();
      formData.append("intent", "update");
      formData.append("taskId", taskId);
      formData.append("columnId", "done");
      fetcher.submit(formData, { method: "post" });
    },
    [setTasks, fetcher],
  );

  const handleArchiveAll = useCallback(() => {
    // 楽観的更新
    setTasks((prevTasks) =>
      prevTasks.filter((task) => task.columnId !== "done"),
    );

    // サーバーに送信
    const formData = new FormData();
    formData.append("intent", "archive");
    fetcher.submit(formData, { method: "post" });
  }, [setTasks, fetcher]);

  const handleTaskUpdate = useCallback(
    (updatedTasks: Task[]) => {
      // 楽観的更新
      setTasks(updatedTasks);

      // サーバーに送信（batch-update）
      const formData = new FormData();
      formData.append("intent", "batch-update");
      formData.append("tasks", JSON.stringify(updatedTasks));
      fetcher.submit(formData, { method: "post" });
    },
    [setTasks, fetcher],
  );

  const filteredTasks = useMemo(() => {
    if (!filterText.trim()) {
      return tasks;
    }
    return tasks.filter((task) =>
      task.content.toLowerCase().includes(filterText.toLowerCase()),
    );
  }, [tasks, filterText]);

  return (
    <div className="flex h-full flex-col gap-4">
      <InputForm onAddTask={handleAddTaskFromForm} />
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Filter value={filterText} onChange={setFilterText} />
        </div>
        <div className="self-end text-sm sm:self-auto">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">今日のタスクをリセット</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>タスクをリセットしますか？</DialogTitle>
                <DialogDescription>
                  今日やる/やらないのタスクを未分類に戻します。
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">キャンセル</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button onClick={handleResetTasks}>リセット</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="-mx-4 flex-1 overflow-hidden">
        <Board
          allTasks={tasks}
          tasks={filteredTasks}
          onTaskUpdate={handleTaskUpdate}
          onDeleteTask={handleDeleteTask}
          onCompleteTask={handleCompleteTask}
          onArchiveAll={handleArchiveAll}
        />
      </div>
    </div>
  );
}

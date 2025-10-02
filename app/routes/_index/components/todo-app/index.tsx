import { useMemo, useState } from "react";
import { Button } from "~/components/ui/button";
import { Board } from "./board";
import { Filter } from "./filter";
import { useTasks } from "./hooks";
import { InputForm } from "./input-form";
import type { Task } from "./types";

export function TodoApp() {
  const { tasks, setTasks } = useTasks();
  const [filterText, setFilterText] = useState<string>("");

  const handleAddTaskFromForm = (content: string) => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      content,
      columnId: "uncategorized", // 初期カラムは未分類
      createdAt: new Date().toISOString(),
    };

    setTasks((prev) => [newTask, ...prev]);
  };

  const handleResetTasks = () => {
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
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));
  };

  const handleCompleteTask = (taskId: string) => {
    setTasks((prevTasks) => {
      const taskToComplete = prevTasks.find((task) => task.id === taskId);
      if (!taskToComplete) return prevTasks;

      const tasksWithoutCompleted = prevTasks.filter(
        (task) => task.id !== taskId,
      );

      const completedTask: Task = { ...taskToComplete, columnId: "done" };

      // 完了タスクを先頭に追加（新しい完了タスクが上に表示される）
      return [completedTask, ...tasksWithoutCompleted];
    });
  };

  const handleArchiveAll = () => {
    const doneTasks = tasks.filter((task) => task.columnId === "done");
    if (doneTasks.length === 0) return;

    const archivedTasks: Task[] = doneTasks.map((task) => ({
      ...task,
      archivedAt: new Date().toISOString(),
    }));

    try {
      const existingArchivedTasks = localStorage.getItem("archivedTasks");
      const currentArchivedTasks: Task[] = existingArchivedTasks
        ? JSON.parse(existingArchivedTasks)
        : [];

      localStorage.setItem(
        "archivedTasks",
        JSON.stringify([...currentArchivedTasks, ...archivedTasks]),
      );

      setTasks((prevTasks) =>
        prevTasks.filter((task) => task.columnId !== "done"),
      );
    } catch (error) {
      console.error("アーカイブに失敗しました:", error);
    }
  };

  const filteredTasks = useMemo(() => {
    if (!filterText.trim()) {
      return tasks;
    }
    return tasks.filter((task) =>
      task.content.toLowerCase().includes(filterText.toLowerCase()),
    );
  }, [tasks, filterText]);

  return (
    <div className="flex h-full flex-col gap-8">
      <InputForm onAddTask={handleAddTaskFromForm} />
      <div className="flex flex-col gap-8 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Filter value={filterText} onChange={setFilterText} />
        </div>
        <div className="self-end text-sm sm:self-auto">
          <ResetButton onResetTasks={handleResetTasks} />
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <Board
          tasks={filteredTasks}
          onTaskUpdate={setTasks}
          onDeleteTask={handleDeleteTask}
          onCompleteTask={handleCompleteTask}
          onArchiveAll={handleArchiveAll}
        />
      </div>
    </div>
  );
}

interface ResetButtonProps {
  onResetTasks: () => void;
}

function ResetButton({ onResetTasks }: ResetButtonProps) {
  return (
    <Button variant="outline" onClick={onResetTasks}>
      今日のタスクをリセット
    </Button>
  );
}

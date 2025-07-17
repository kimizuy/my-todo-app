import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react";
import { debounce } from "~/lib/utils";
import type { Task } from "./types";
import { updateTasksWithCreatedAt } from "./utils";

export function useTasks() {
  const [tasks, setTasksState] = useState<Task[]>([]);

  // LocalStorageへの保存をdebounceで最適化
  const debouncedSave = useMemo(
    () =>
      debounce((tasks: Task[]) => {
        try {
          localStorage.setItem("tasks", JSON.stringify(tasks));
        } catch (error) {
          console.error("タスクの保存に失敗しました:", error);
        }
      }, 500),
    [],
  );

  useEffect(function hydrateFromLocalStorage() {
    try {
      const storedTasks = localStorage.getItem("tasks");
      if (storedTasks) {
        const parsedTasks: Task[] = JSON.parse(storedTasks);
        const tasksWithCreatedAt = updateTasksWithCreatedAt(
          parsedTasks,
          "tasks",
        );
        setTasksState(tasksWithCreatedAt);
      }
    } catch (error) {
      console.error("タスクの読み込みに失敗しました:", error);
    }
  }, []);

  const setTasks: Dispatch<SetStateAction<Task[]>> = (value) => {
    setTasksState((prevTasks) => {
      const newTasks = typeof value === "function" ? value(prevTasks) : value;

      // 非同期でLocalStorageに保存
      debouncedSave(newTasks);

      return newTasks;
    });
  };

  return { tasks, setTasks };
}

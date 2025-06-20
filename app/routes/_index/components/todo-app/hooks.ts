import type { Task } from "./types";
import { updateTasksWithCreatedAt } from "./utils";
import { useState, useEffect, type SetStateAction, type Dispatch } from "react";

export function useTasks() {
  const [tasks, setTasksState] = useState<Task[]>([]);

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

      try {
        localStorage.setItem("tasks", JSON.stringify(newTasks));
      } catch (error) {
        console.error("タスクの保存に失敗しました:", error);
      }

      return newTasks;
    });
  };

  return { tasks, setTasks };
}

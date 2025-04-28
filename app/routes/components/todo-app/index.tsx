import { Column } from "./column";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useState, useEffect, type FormEvent } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

const COLUMNS = [
  { id: "uncategorized", title: "未分類" },
  { id: "do-today", title: "今日やる" },
  { id: "do-not-today", title: "今日やらない" },
  { id: "done", title: "完了" },
] as const;

export type ColumnId = (typeof COLUMNS)[number]["id"];

export interface Task {
  id: string;
  content: string;
  columnId: ColumnId;
}

export function TodoApp() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [todoInput, setTodoInput] = useState<string>("");

  useEffect(function loadTasksFromLocalStorage() {
    const storedTasks = localStorage.getItem("tasks");

    if (storedTasks) {
      setTasks(JSON.parse(storedTasks));
    }
  }, []);

  useEffect(
    function saveTasksToLocalStorage() {
      localStorage.setItem("tasks", JSON.stringify(tasks));
    },
    [tasks],
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const id = active.id as string;

    const task = tasks.find((task) => task.id === id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // タスクからコンテナへのドラッグの場合
    if (isColumnId(overId)) {
      const activeTask = tasks.find((task) => task.id === activeId);

      if (!activeTask) return;

      // コンテナが変わる場合のみ処理する
      if (activeTask.columnId !== overId) {
        setTasks((prev) =>
          prev.map((task) =>
            task.id === activeId ? { ...task, columnId: overId } : task,
          ),
        );
      }
      return;
    }

    // タスク間のドラッグ
    const activeTask = tasks.find((task) => task.id === activeId);
    const overTask = tasks.find((task) => task.id === overId);

    if (!activeTask || !overTask) return;

    // 異なる列への移動
    if (activeTask.columnId !== overTask.columnId) {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === activeId
            ? { ...task, columnId: overTask.columnId }
            : task,
        ),
      );
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveTask(null);
      return;
    }

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) {
      setActiveTask(null);
      return;
    }

    const activeTask = tasks.find((task) => task.id === activeId);

    if (!activeTask) {
      setActiveTask(null);
      return;
    }

    // 同じカラム内での並び替え
    const columnTasks = tasks.filter(
      (task) => task.columnId === activeTask.columnId,
    );
    const oldIndex = columnTasks.findIndex((task) => task.id === activeId);
    const newIndex = columnTasks.findIndex((task) => task.id === overId);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reorderedColumnTasks = arrayMove(columnTasks, oldIndex, newIndex);

      // 他のカラムのタスクと結合して新しいタスク配列を作成
      setTasks((prev) => [
        ...prev.filter((task) => task.columnId !== activeTask.columnId),
        ...reorderedColumnTasks,
      ]);
    }

    setActiveTask(null);
  };

  const handleAddTodoTask = (event: FormEvent) => {
    event.preventDefault();

    if (!todoInput.trim()) return;

    const newTask: Task = {
      id: `task-${Date.now()}`,
      content: todoInput,
      columnId: "uncategorized",
    };

    setTasks((prev) => [...prev, newTask]);
    setTodoInput("");
  };

  const handleResetDailyTasks = () => {
    setTasks((prevTasks) =>
      prevTasks.map((task) => {
        if (task.columnId === "do-today" || task.columnId === "do-not-today") {
          return { ...task, columnId: "uncategorized" };
        }
        return task;
      }),
    );
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));
  };

  const getTasksByColumn = (columnId: ColumnId) => {
    return tasks.filter((task) => task.columnId === columnId);
  };

  return (
    <div className="flex flex-col gap-8">
      <form className="flex gap-2" onSubmit={handleAddTodoTask}>
        <Input
          type="text"
          placeholder="今日やるタスクを入力"
          value={todoInput}
          onChange={(e) => setTodoInput(e.target.value)}
          className="flex-1"
        />
        <Button type="submit">追加</Button>
      </form>

      <Button
        variant="outline"
        onClick={handleResetDailyTasks}
        className="self-end text-sm"
      >
        今日のタスクをリセット
      </Button>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
          {COLUMNS.map((column) => (
            <Column
              key={column.id}
              id={column.id}
              title={column.title}
              tasks={getTasksByColumn(column.id)}
              onDeleteTask={handleDeleteTask}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask ? (
            <div className="cursor-grabbing rounded border border-blue-500 p-3 shadow-lg">
              {activeTask.content}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function isColumnId(value: unknown): value is ColumnId {
  return (
    typeof value === "string" && COLUMNS.some((column) => column.id === value)
  );
}

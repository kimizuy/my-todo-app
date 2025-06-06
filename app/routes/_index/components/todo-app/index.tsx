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
      try {
        const parsedTasks = JSON.parse(storedTasks);
        setTasks(parsedTasks);
      } catch (error) {
        console.error("タスクの読み込みに失敗しました:", error);
        setTasks([]);
      }
    }
  }, []);

  useEffect(
    function saveTasksToLocalStorage() {
      localStorage.setItem("tasks", JSON.stringify(tasks));
    },
    [tasks],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 1, // 削除ボタンをクリックしたときにドラッグを開始しないようにする
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const id = active.id as string;

    const foundTask = tasks.find((task) => task.id === id);
    if (foundTask) {
      setActiveTask(foundTask);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // タスクをカラムにドロップする場合
    if (isColumnId(overId)) {
      const foundTask = tasks.find((task) => task.id === activeId);

      // タスクが見つからない場合は処理しない
      if (!foundTask) return;

      // カラムが変わる場合のみ処理する
      if (foundTask.columnId !== overId) {
        setTasks((prev) =>
          prev.map((task) =>
            task.id === activeId ? { ...task, columnId: overId } : task,
          ),
        );
      }
      return;
    }

    // タスク間のドラッグ処理
    const draggedTask = tasks.find((task) => task.id === activeId);
    const targetTask = tasks.find((task) => task.id === overId);

    // いずれかのタスクが見つからない場合は処理しない
    if (!draggedTask || !targetTask) return;

    // 異なるカラムへの移動時のみ処理
    if (draggedTask.columnId !== targetTask.columnId) {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === activeId
            ? { ...task, columnId: targetTask.columnId }
            : task,
        ),
      );
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // ドラッグ先がない場合は処理を終了
    if (!over) {
      setActiveTask(null);
      return;
    }

    const activeId = active.id;
    const overId = over.id;

    // 同じアイテム上でドラッグが終了した場合は処理しない
    if (activeId === overId) {
      setActiveTask(null);
      return;
    }

    const draggedTask = tasks.find((task) => task.id === activeId);

    // ドラッグされたタスクが見つからない場合は処理を終了
    if (!draggedTask) {
      setActiveTask(null);
      return;
    }

    // 同じカラム内での並び替え処理
    const columnTasks = tasks.filter(
      (task) => task.columnId === draggedTask.columnId,
    );
    const oldIndex = columnTasks.findIndex((task) => task.id === activeId);
    const newIndex = columnTasks.findIndex((task) => task.id === overId);

    // インデックスが有効な場合のみ処理
    if (oldIndex !== -1 && newIndex !== -1) {
      const reorderedColumnTasks = arrayMove(columnTasks, oldIndex, newIndex);

      // 他のカラムのタスクと結合して新しいタスク配列を作成
      setTasks((prev) => [
        ...prev.filter((task) => task.columnId !== draggedTask.columnId),
        ...reorderedColumnTasks,
      ]);
    }

    setActiveTask(null);
  };

  const handleAddTask = (event: FormEvent) => {
    event.preventDefault();

    if (!todoInput.trim()) return;

    const newTask: Task = {
      id: `task-${Date.now()}`,
      content: todoInput.trim(),
      columnId: "uncategorized", // 初期カラムは未分類
    };

    setTasks((prev) => [...prev, newTask]);
    setTodoInput("");
  };

  const handleResetTasks = () => {
    setTasks((prevTasks) =>
      prevTasks.map((task) => {
        // 今日やる/やらないのタスクを未分類に戻す
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

  const handleCompleteTask = (taskId: string) => {
    setTasks((prevTasks) => {
      const taskToComplete = prevTasks.find((task) => task.id === taskId);
      if (!taskToComplete) return prevTasks;

      const tasksWithoutCompleted = prevTasks.filter(
        (task) => task.id !== taskId,
      );

      const completedTask: Task = { ...taskToComplete, columnId: "done" };

      return [completedTask, ...tasksWithoutCompleted];
    });
  };

  const getTasksByColumn = (columnId: ColumnId): Task[] => {
    return tasks.filter((task) => task.columnId === columnId);
  };

  return (
    <div className="flex flex-col gap-8">
      <form className="flex gap-2" onSubmit={handleAddTask}>
        <Input
          type="text"
          placeholder="新しいタスクを入力"
          value={todoInput}
          onChange={(e) => setTodoInput(e.target.value)}
          className="flex-1"
          aria-label="新しいタスクを入力"
        />
        <Button type="submit">追加</Button>
      </form>

      <Button
        variant="outline"
        onClick={handleResetTasks}
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
              onCompleteTask={handleCompleteTask}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask ? (
            <div className="min-h-[58px] cursor-grabbing rounded border border-blue-500 p-3">
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

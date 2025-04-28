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
  { id: "todo", title: "今日やる" },
  { id: "done", title: "今日やらない" },
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

    const activeId = active.id as string;
    const overId = over.id as string;

    // タスクからコンテナへのドラッグの場合
    if (overId === "todo" || overId === "done") {
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

    const activeId = active.id as string;
    const overId = over.id as string;

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
      columnId: "todo",
    };

    setTasks((prev) => [...prev, newTask]);
    setTodoInput("");
  };

  const getTasksByColumn = (columnId: ColumnId) => {
    return tasks.filter((task) => task.columnId === columnId);
  };

  return (
    <div>
      <div className="mb-5 flex gap-5">
        <form className="flex flex-1 gap-2" onSubmit={handleAddTodoTask}>
          <Input
            type="text"
            placeholder="今日やるタスクを入力"
            value={todoInput}
            onChange={(e) => setTodoInput(e.target.value)}
            className="flex-1"
          />
          <Button type="submit">追加</Button>
        </form>
      </div>

      <div className="flex gap-5">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {COLUMNS.map((column) => (
            <Column
              key={column.id}
              id={column.id}
              title={column.title}
              tasks={getTasksByColumn(column.id)}
            />
          ))}
          <DragOverlay>
            {activeTask ? (
              <div className="cursor-grabbing rounded border border-blue-500 p-3 shadow-lg">
                {activeTask.content}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}

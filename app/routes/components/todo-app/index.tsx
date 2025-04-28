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

export interface Task {
  id: string;
  content: string;
  columnId: (typeof COLUMNS)[number]["id"];
}

export function TodoApp() {
  const [todoTasks, setTodoTasks] = useState<Task[]>([]);
  const [doneTasks, setDoneTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [todoInput, setTodoInput] = useState<string>("");

  useEffect(function loadTasksFromLocalStorage() {
    const storedTodoTasks = localStorage.getItem("todoTasks");
    const storedDoneTasks = localStorage.getItem("doneTasks");

    if (storedTodoTasks) {
      setTodoTasks(JSON.parse(storedTodoTasks));
    }

    if (storedDoneTasks) {
      setDoneTasks(JSON.parse(storedDoneTasks));
    }
  }, []);

  useEffect(
    function saveTasksToLocalStorage() {
      localStorage.setItem("todoTasks", JSON.stringify(todoTasks));
      localStorage.setItem("doneTasks", JSON.stringify(doneTasks));
    },
    [todoTasks, doneTasks],
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

    const task = [...todoTasks, ...doneTasks].find((task) => task.id === id);
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
      const activeTask = [...todoTasks, ...doneTasks].find(
        (task) => task.id === activeId,
      );

      if (!activeTask) return;

      // コンテナが変わる場合のみ処理する
      if (activeTask.columnId !== overId) {
        if (overId === "todo") {
          setTodoTasks((prev) => [
            ...prev,
            { ...activeTask, columnId: "todo" },
          ]);
          setDoneTasks((prev) => prev.filter((task) => task.id !== activeId));
        } else {
          setDoneTasks((prev) => [
            ...prev,
            { ...activeTask, columnId: "done" },
          ]);
          setTodoTasks((prev) => prev.filter((task) => task.id !== activeId));
        }
      }
      return;
    }

    // タスク間のドラッグ
    const activeTask = [...todoTasks, ...doneTasks].find(
      (task) => task.id === activeId,
    );
    const overTask = [...todoTasks, ...doneTasks].find(
      (task) => task.id === overId,
    );

    if (!activeTask || !overTask) return;

    // 異なる列への移動
    if (activeTask.columnId !== overTask.columnId) {
      const isMovingToTodo = overTask.columnId === "todo";

      if (isMovingToTodo) {
        setTodoTasks((prev) => [...prev, { ...activeTask, columnId: "todo" }]);
        setDoneTasks((prev) => prev.filter((task) => task.id !== activeId));
      } else {
        setDoneTasks((prev) => [...prev, { ...activeTask, columnId: "done" }]);
        setTodoTasks((prev) => prev.filter((task) => task.id !== activeId));
      }
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

    const activeTask = [...todoTasks, ...doneTasks].find(
      (task) => task.id === activeId,
    );

    if (!activeTask) {
      setActiveTask(null);
      return;
    }

    if (activeTask.columnId === "todo") {
      setTodoTasks((prev) => {
        const oldIndex = prev.findIndex((task) => task.id === activeId);
        const newIndex = prev.findIndex((task) => task.id === overId);

        if (oldIndex !== -1 && newIndex !== -1) {
          return arrayMove(prev, oldIndex, newIndex);
        }

        return prev;
      });
    } else {
      setDoneTasks((prev) => {
        const oldIndex = prev.findIndex((task) => task.id === activeId);
        const newIndex = prev.findIndex((task) => task.id === overId);

        if (oldIndex !== -1 && newIndex !== -1) {
          return arrayMove(prev, oldIndex, newIndex);
        }

        return prev;
      });
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

    setTodoTasks((prev) => [newTask, ...prev]);
    setTodoInput("");
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
              tasks={column.id === "todo" ? todoTasks : doneTasks}
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

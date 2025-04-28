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
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";

export interface Task {
  id: string;
  content: string;
  column: "todo" | "done";
}

function loadFromLocalStorage(): { todoTasks: Task[]; doneTasks: Task[] } {
  try {
    if (typeof window === "undefined") {
      return { todoTasks: [], doneTasks: [] };
    }
    const storedTodoTasks = localStorage.getItem("todoTasks");
    const storedDoneTasks = localStorage.getItem("doneTasks");

    return {
      todoTasks: storedTodoTasks ? JSON.parse(storedTodoTasks) : [],
      doneTasks: storedDoneTasks ? JSON.parse(storedDoneTasks) : [],
    };
  } catch (error) {
    console.error("Failed to load from localStorage:", error);
    return {
      todoTasks: [],
      doneTasks: [],
    };
  }
}

export function TodoApp() {
  // ローカルストレージからデータを読み込んで初期化
  const { todoTasks: initialTodoTasks, doneTasks: initialDoneTasks } =
    loadFromLocalStorage();

  const [todoTasks, setTodoTasks] = useState<Task[]>(initialTodoTasks);
  const [doneTasks, setDoneTasks] = useState<Task[]>(initialDoneTasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // タスクの状態が変わったらローカルストレージに保存
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
      if (activeTask.column !== overId) {
        if (overId === "todo") {
          setTodoTasks((prev) => [...prev, { ...activeTask, column: "todo" }]);
          setDoneTasks((prev) => prev.filter((task) => task.id !== activeId));
        } else {
          setDoneTasks((prev) => [...prev, { ...activeTask, column: "done" }]);
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
    if (activeTask.column !== overTask.column) {
      const isMovingToTodo = overTask.column === "todo";

      if (isMovingToTodo) {
        setTodoTasks((prev) => [...prev, { ...activeTask, column: "todo" }]);
        setDoneTasks((prev) => prev.filter((task) => task.id !== activeId));
      } else {
        setDoneTasks((prev) => [...prev, { ...activeTask, column: "done" }]);
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

    if (activeTask.column === "todo") {
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

  // タスクを追加する関数
  const addNewTask = (column: "todo" | "done") => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      content: `新しいタスク ${Math.floor(Math.random() * 1000)}`,
      column,
    };

    if (column === "todo") {
      setTodoTasks((prev) => [...prev, newTask]);
    } else {
      setDoneTasks((prev) => [...prev, newTask]);
    }
  };

  return (
    <div>
      <div className="mb-5 flex gap-5">
        <Button onClick={() => addNewTask("todo")}>
          「今日やる」にタスクを追加
        </Button>
        <Button onClick={() => addNewTask("done")}>
          「今日やらない」にタスクを追加
        </Button>
      </div>

      <div className="flex gap-5">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <Column id="todo" title="今日やる" tasks={todoTasks} />
          <Column id="done" title="今日やらない" tasks={doneTasks} />
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

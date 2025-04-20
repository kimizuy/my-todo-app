import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  useDroppable,
  type DragStartEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useState } from "react";

interface Task {
  id: string;
  content: string;
  column: "todo" | "done";
}

function loadFromLocalStorage(): { todoTasks: Task[]; doneTasks: Task[] } {
  try {
    const storedTodoTasks = localStorage.getItem("todoTasks");
    const storedDoneTasks = localStorage.getItem("doneTasks");

    return {
      todoTasks: storedTodoTasks
        ? JSON.parse(storedTodoTasks)
        : [
            { id: "1", content: "タスク1", column: "todo" },
            { id: "2", content: "タスク2", column: "todo" },
          ],
      doneTasks: storedDoneTasks
        ? JSON.parse(storedDoneTasks)
        : [
            { id: "3", content: "タスク3", column: "done" },
            { id: "4", content: "タスク4", column: "done" },
          ],
    };
  } catch (error) {
    console.error("Failed to load from localStorage:", error);
    return {
      todoTasks: [
        { id: "1", content: "タスク1", column: "todo" },
        { id: "2", content: "タスク2", column: "todo" },
      ],
      doneTasks: [
        { id: "3", content: "タスク3", column: "done" },
        { id: "4", content: "タスク4", column: "done" },
      ],
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
      <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
        <button
          type="button"
          onClick={() => addNewTask("todo")}
          style={{ padding: "8px 16px" }}
        >
          「今日やる」にタスクを追加
        </button>
        <button
          type="button"
          onClick={() => addNewTask("done")}
          style={{ padding: "8px 16px" }}
        >
          「今日やらない」にタスクを追加
        </button>
      </div>

      <div style={{ display: "flex", gap: "20px" }}>
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
              <div
                style={{
                  padding: "10px",
                  backgroundColor: "#f0f0f0",
                  borderRadius: "4px",
                }}
              >
                {activeTask.content}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}

interface ColumnProps {
  id: string;
  title: string;
  tasks: Task[];
}

function Column({ id, title, tasks }: ColumnProps) {
  const { setNodeRef } = useDroppable({
    id,
  });

  const columnTasks = tasks.filter((task) => task.column === id);

  return (
    <div
      ref={setNodeRef}
      style={{
        width: "250px",
        padding: "10px",
        backgroundColor: "#f5f5f5",
        borderRadius: "5px",
        minHeight: "300px", // 最小の高さを設定
        display: "flex",
        flexDirection: "column",
      }}
    >
      <h2>{title}</h2>
      <SortableContext
        items={columnTasks.map((task) => task.id)}
        strategy={verticalListSortingStrategy}
      >
        <div style={{ flexGrow: 1 }}>
          {columnTasks.map((task) => (
            <SortableItem key={task.id} task={task} />
          ))}
          {columnTasks.length === 0 && (
            <div
              style={{
                padding: "10px",
                margin: "5px 0",
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                border: "1px dashed #ccc",
                borderRadius: "4px",
                minHeight: "40px",
              }}
            >
              ここにタスクをドロップ
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

interface SortableItemProps {
  task: Task;
}

function SortableItem({ task }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    padding: "10px",
    margin: "5px 0",
    backgroundColor: "white",
    border: "1px solid #ddd",
    borderRadius: "4px",
    cursor: "grab",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {task.content}
    </div>
  );
}

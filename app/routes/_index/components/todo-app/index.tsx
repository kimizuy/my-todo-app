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
import {
  useState,
  useEffect,
  type FormEvent,
  type SetStateAction,
  type Dispatch,
} from "react";
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
  createdAt: string;
  archivedAt?: string;
}

export function TodoApp() {
  const { tasks, setTasks } = useTasks();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [todoInput, setTodoInput] = useState<string>("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 1, // タスクカード上のボタンをクリックしたときにドラッグを開始しないようにする
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
      createdAt: new Date().toISOString(),
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
              onArchiveAll={column.id === "done" ? handleArchiveAll : undefined}
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

function useTasks() {
  const [tasks, setTasksState] = useState<Task[]>([]);

  useEffect(function hydrateFromLocalStorage() {
    try {
      const storedTasks = localStorage.getItem("tasks");
      if (storedTasks) {
        const parsedTasks: Task[] = JSON.parse(storedTasks);
        
        // 既存データにcreatedAtがない場合は現在時刻を設定
        const tasksWithCreatedAt = parsedTasks.map((task) => ({
          ...task,
          createdAt: task.createdAt || new Date().toISOString(),
        }));
        
        setTasksState(tasksWithCreatedAt);
        
        // createdAtを追加した場合はlocalStorageを更新
        const hasUpdatedTasks = tasksWithCreatedAt.some(
          (task, index) => task.createdAt !== parsedTasks[index]?.createdAt
        );
        
        if (hasUpdatedTasks) {
          localStorage.setItem("tasks", JSON.stringify(tasksWithCreatedAt));
        }
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

function isColumnId(value: unknown): value is ColumnId {
  return (
    typeof value === "string" && COLUMNS.some((column) => column.id === value)
  );
}

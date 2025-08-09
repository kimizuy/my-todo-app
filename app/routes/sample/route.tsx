import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { Column } from "../_index/components/todo-app/board/column";
import { TaskContent } from "../_index/components/todo-app/board/item";
import { Filter } from "../_index/components/todo-app/filter";
import { InputForm } from "../_index/components/todo-app/input-form";
import type { ColumnId, Task } from "../_index/components/todo-app/types";
import { COLUMNS, isColumnId } from "../_index/components/todo-app/types";
import type { Route } from "./+types/route";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Sample Kanban Board" },
    { name: "description", content: "Sample kanban board layout" },
  ];
}

// Sample data in Task format
const SAMPLE_TASKS: Task[] = [
  {
    id: "task-1",
    content: "ユーザー認証機能の実装",
    columnId: "uncategorized",
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "task-2",
    content: "データベース設計の見直し",
    columnId: "uncategorized",
    createdAt: "2024-01-02T00:00:00Z",
  },
  {
    id: "task-3",
    content: "パフォーマンス最適化",
    columnId: "uncategorized",
    createdAt: "2024-01-03T00:00:00Z",
  },
  {
    id: "task-4",
    content: "ダッシュボード機能の追加",
    columnId: "uncategorized",
    createdAt: "2024-01-04T00:00:00Z",
  },
  {
    id: "task-5",
    content: "エラーハンドリングの改善",
    columnId: "uncategorized",
    createdAt: "2024-01-05T00:00:00Z",
  },
  {
    id: "task-6",
    content: "通知システムの実装",
    columnId: "uncategorized",
    createdAt: "2024-01-06T00:00:00Z",
  },
  {
    id: "task-7",
    content: "セキュリティアップデート",
    columnId: "uncategorized",
    createdAt: "2024-01-07T00:00:00Z",
  },
  {
    id: "task-8",
    content: "APIエンドポイントの作成",
    columnId: "do-today",
    createdAt: "2024-01-08T00:00:00Z",
  },
  {
    id: "task-9",
    content: "バグ修正: ログイン画面",
    columnId: "do-today",
    createdAt: "2024-01-09T00:00:00Z",
  },
  {
    id: "task-10",
    content: "UIコンポーネントの実装",
    columnId: "do-not-today",
    createdAt: "2024-01-10T00:00:00Z",
  },
  {
    id: "task-11",
    content: "ドキュメント更新",
    columnId: "done",
    createdAt: "2024-01-11T00:00:00Z",
  },
  {
    id: "task-12",
    content: "テストケースの追加",
    columnId: "done",
    createdAt: "2024-01-12T00:00:00Z",
  },
];

export default function Sample() {
  const [tasks, setTasks] = useState<Task[]>(SAMPLE_TASKS);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [filterText, setFilterText] = useState<string>("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // スクロール操作との競合を減らすため、より大きな値に設定
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const filteredTasks = useMemo(() => {
    if (!filterText.trim()) {
      return tasks;
    }
    return tasks.filter((task) =>
      task.content.toLowerCase().includes(filterText.toLowerCase()),
    );
  }, [tasks, filterText]);

  const tasksByColumn = useMemo(() => {
    const grouped: Record<ColumnId, Task[]> = {
      uncategorized: [],
      "do-today": [],
      "do-not-today": [],
      done: [],
    };

    filteredTasks.forEach((task) => {
      grouped[task.columnId].push(task);
    });

    return grouped;
  }, [filteredTasks]);

  // 自動スクロール機能
  const autoScroll = useCallback((clientX: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const scrollThreshold = 100; // 端からの距離
    const scrollSpeed = 10; // スクロール速度

    if (
      clientX - containerRect.left < scrollThreshold &&
      container.scrollLeft > 0
    ) {
      // 左にスクロール
      container.scrollLeft = Math.max(0, container.scrollLeft - scrollSpeed);
    } else if (containerRect.right - clientX < scrollThreshold) {
      // 右にスクロール
      const maxScrollLeft = container.scrollWidth - container.clientWidth;
      container.scrollLeft = Math.min(
        maxScrollLeft,
        container.scrollLeft + scrollSpeed,
      );
    }
  }, []);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const id = active.id as string;

      const foundTask = tasks.find((task) => task.id === id);
      if (foundTask) {
        setActiveTask(foundTask);
      }
    },
    [tasks],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;

      if (!over) return;

      // 自動スクロール処理
      if ("clientX" in event && typeof event.clientX === "number") {
        autoScroll(event.clientX);
      }

      const activeId = active.id as string;
      const overId = over.id;

      // ドラッグ中のタスクを一度だけ検索
      const draggedTask = tasks.find((task) => task.id === activeId);
      if (!draggedTask) return;

      // ドロップ先のカラムIDを決定
      let targetColumnId: ColumnId;

      if (isColumnId(overId)) {
        // カラムに直接ドロップ
        targetColumnId = overId;
      } else {
        // 他のタスクの上にドロップ
        const targetTask = tasks.find((task) => task.id === overId);
        if (!targetTask) return;
        targetColumnId = targetTask.columnId;
      }

      // カラムが変わる場合のみ更新
      if (draggedTask.columnId !== targetColumnId) {
        const updatedTasks = tasks.map((task) =>
          task.id === activeId ? { ...task, columnId: targetColumnId } : task,
        );
        setTasks(updatedTasks);
      }
    },
    [tasks, autoScroll],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
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
        const updatedTasks = [
          ...tasks.filter((task) => task.columnId !== draggedTask.columnId),
          ...reorderedColumnTasks,
        ];
        setTasks(updatedTasks);
      }

      setActiveTask(null);
    },
    [tasks],
  );

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
    setTasks((prevTasks) =>
      prevTasks.filter((task) => task.columnId !== "done"),
    );
  };

  const handleAddTaskFromForm = (content: string) => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      content,
      columnId: "uncategorized",
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [newTask, ...prev]);
  };

  const handleResetTasks = () => {
    setTasks((prevTasks) => {
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

      const resetDoTodayTasks = doTodayTasks.map((task) => ({
        ...task,
        columnId: "uncategorized" as const,
      }));
      const resetDoNotTodayTasks = doNotTodayTasks.map((task) => ({
        ...task,
        columnId: "uncategorized" as const,
      }));

      const uncategorizedTasks = otherTasks.filter(
        (task) => task.columnId === "uncategorized",
      );
      const nonUncategorizedTasks = otherTasks.filter(
        (task) => task.columnId !== "uncategorized",
      );

      return [
        ...nonUncategorizedTasks,
        ...resetDoTodayTasks,
        ...resetDoNotTodayTasks,
        ...uncategorizedTasks,
      ];
    });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Input Area - Fixed and Responsive */}
      <div className="px-5 pt-5">
        <div className="flex flex-col gap-4">
          <InputForm onAddTask={handleAddTaskFromForm} />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <Filter value={filterText} onChange={setFilterText} />
            </div>
            <div className="self-end text-sm sm:self-auto">
              <ResetButton onResetTasks={handleResetTasks} />
            </div>
          </div>
        </div>
      </div>

      {/* Board Area - Scrollable */}
      {/* biome-ignore lint/nursery/useUniqueElementIds: Fixed ID required for SSR hydration compatibility with @dnd-kit */}
      <DndContext
        id="sample-kanban-dnd"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div
          ref={scrollContainerRef}
          className="flex flex-1 gap-4 overflow-x-auto overflow-y-hidden p-5"
        >
          {COLUMNS.map((column) => (
            <Column
              key={column.id}
              id={column.id}
              title={column.title}
              tasks={tasksByColumn[column.id] || []}
              onDeleteTask={handleDeleteTask}
              onCompleteTask={handleCompleteTask}
              onArchiveAll={column.id === "done" ? handleArchiveAll : undefined}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask ? (
            <div className="flex cursor-grabbing items-center justify-between rounded border border-blue-500 p-3">
              <TaskContent task={activeTask} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
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

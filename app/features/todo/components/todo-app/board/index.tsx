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
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useState } from "react";
import type { ColumnId, Task } from "~/features/todo/schema";
import { Column } from "./column";
import { TaskContent } from "./item";
import {
  findTaskById,
  getTasksByColumn,
  isColumnId,
  moveTaskToColumn,
  reorderTasksInColumn,
} from "./utils";

interface Props {
  allTasks: Task[];
  tasks: Task[];
  onTaskUpdate: (tasks: Task[]) => void;
  onDeleteTask: (taskId: string) => void;
  onCompleteTask: (taskId: string) => void;
  onArchiveAll: () => void;
}

const EMPTY_TASKS: Task[] = [];

export function Board({
  allTasks,
  tasks,
  onTaskUpdate,
  onDeleteTask,
  onCompleteTask,
  onArchiveAll,
}: Props) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

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

    const foundTask = findTaskById(allTasks, id);
    if (foundTask) {
      setActiveTask(foundTask);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id;

    const draggedTask = findTaskById(allTasks, activeId);
    if (!draggedTask) return;

    // ドロップ先のカラムIDを決定
    let targetColumnId: ColumnId;

    if (isColumnId(overId)) {
      // カラムに直接ドロップ
      targetColumnId = overId;
    } else {
      // 他のタスクの上にドロップ
      const targetTask = findTaskById(allTasks, overId as string);
      if (!targetTask) return;
      targetColumnId = targetTask.columnId;
    }

    // カラムが変わる場合のみ更新
    if (draggedTask.columnId !== targetColumnId) {
      const updatedTasks = moveTaskToColumn(allTasks, activeId, targetColumnId);
      onTaskUpdate(updatedTasks);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // ドラッグ先がない場合は処理を終了
    if (!over) {
      setActiveTask(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // 同じアイテム上でドラッグが終了した場合は処理しない
    if (activeId === overId) {
      setActiveTask(null);
      return;
    }

    const draggedTask = findTaskById(allTasks, activeId);

    // ドラッグされたタスクが見つからない場合は処理を終了
    if (!draggedTask) {
      setActiveTask(null);
      return;
    }

    // 同じカラム内での並び替え処理
    const columnTasks = getTasksByColumn(allTasks, draggedTask.columnId);
    const oldIndex = columnTasks.findIndex((task) => task.id === activeId);
    const newIndex = columnTasks.findIndex((task) => task.id === overId);

    // インデックスが有効な場合のみ処理
    if (oldIndex !== -1 && newIndex !== -1) {
      const tasksWithUpdatedOrder = reorderTasksInColumn(
        columnTasks,
        oldIndex,
        newIndex,
      );

      // 他のカラムのタスクと結合して新しいタスク配列を作成
      const updatedTasks = [
        ...allTasks.filter((task) => task.columnId !== draggedTask.columnId),
        ...tasksWithUpdatedOrder,
      ];
      onTaskUpdate(updatedTasks);
    }

    setActiveTask(null);
  };

  const grouped: Record<ColumnId, Task[]> = {
    uncategorized: [],
    "do-today": [],
    "do-not-today": [],
    done: [],
  };

  tasks.forEach((task) => {
    grouped[task.columnId].push(task);
  });

  // 各カラムのタスクをorderでソート
  for (const columnId in grouped) {
    grouped[columnId as ColumnId].sort((a, b) => a.order - b.order);
  }

  const tasksByColumn = grouped;

  const counts: Record<ColumnId, number> = {
    uncategorized: 0,
    "do-today": 0,
    "do-not-today": 0,
    done: 0,
  };

  allTasks.forEach((task) => {
    counts[task.columnId]++;
  });

  const totalTaskCountByColumn = counts;

  return (
    <div className="h-full">
      {/* biome-ignore lint/correctness/useUniqueElementIds: Fixed ID required for SSR hydration compatibility with @dnd-kit */}
      <DndContext
        id="main-kanban-dnd"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {/* biome-ignore lint/correctness/useUniqueElementIds: Skip link target requires static ID */}
        <div id="task-board" className="flex h-full gap-4 overflow-x-auto px-4">
          {COLUMNS.map((column) => (
            <Column
              key={column.id}
              id={column.id}
              title={column.title}
              tasks={tasksByColumn[column.id] || EMPTY_TASKS}
              totalCount={totalTaskCountByColumn[column.id]}
              onDeleteTask={onDeleteTask}
              onCompleteTask={onCompleteTask}
              onArchiveAll={column.id === "done" ? onArchiveAll : undefined}
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

const COLUMNS: {
  id: ColumnId;
  title: string;
}[] = [
  { id: "uncategorized", title: "未分類" },
  { id: "do-today", title: "今日やる" },
  { id: "do-not-today", title: "今日やらない" },
  { id: "done", title: "完了" },
];

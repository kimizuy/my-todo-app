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
import { useCallback, useState } from "react";
import type { ColumnId, Task } from "../types";
import { COLUMNS, isColumnId } from "../types";
import { Column } from "./column";
import { TaskContent } from "./item";

interface Props {
  tasks: Task[];
  onTaskUpdate: (tasks: Task[]) => void;
  onDeleteTask: (taskId: string) => void;
  onCompleteTask: (taskId: string) => void;
  onArchiveAll: () => void;
}

export function Board({
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

      const activeId = active.id;
      const overId = over.id;

      // タスクをカラムにドロップする場合
      if (isColumnId(overId)) {
        const foundTask = tasks.find((task) => task.id === activeId);

        // タスクが見つからない場合は処理しない
        if (!foundTask) return;

        // カラムが変わる場合のみ処理する
        if (foundTask.columnId !== overId) {
          const updatedTasks = tasks.map((task) =>
            task.id === activeId ? { ...task, columnId: overId } : task,
          );
          onTaskUpdate(updatedTasks);
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
        const updatedTasks = tasks.map((task) =>
          task.id === activeId
            ? { ...task, columnId: targetTask.columnId }
            : task,
        );
        onTaskUpdate(updatedTasks);
      }
    },
    [tasks, onTaskUpdate],
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
        onTaskUpdate(updatedTasks);
      }

      setActiveTask(null);
    },
    [tasks, onTaskUpdate],
  );

  const getTasksByColumn = useCallback(
    (columnId: ColumnId): Task[] => {
      return tasks.filter((task) => task.columnId === columnId);
    },
    [tasks],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {COLUMNS.map((column) => (
          <Column
            key={column.id}
            id={column.id}
            title={column.title}
            tasks={getTasksByColumn(column.id)}
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
  );
}

import type { Task } from ".";
import { SortableItem } from "./sortable-item";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { cn } from "~/lib/utils";

interface ColumnProps {
  id: string;
  title: string;
  tasks: Task[];
}

export function Column({ id, title, tasks }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  const columnTasks = tasks.filter((task) => task.column === id);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[300px] w-64 flex-col rounded p-3",
        isOver && "border-2 border-blue-500",
      )}
    >
      <h2 className="mb-2 text-lg font-medium">{title}</h2>
      <SortableContext
        items={columnTasks.map((task) => task.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-grow">
          {columnTasks.map((task) => (
            <SortableItem key={task.id} task={task} />
          ))}
          {columnTasks.length === 0 && (
            <div className="border-secondary my-1 flex min-h-[40px] items-center justify-center rounded border border-dashed p-3">
              ここにタスクをドロップ
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

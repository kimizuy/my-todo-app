import type { ColumnId, Task } from ".";
import { SortableItem } from "./sortable-item";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { PartyPopper } from "lucide-react";
import { cn } from "~/lib/utils";

interface ColumnProps {
  id: ColumnId;
  title: string;
  tasks: Task[];
  onDeleteTask: (taskId: string) => void;
}

export function Column({ id, title, tasks, onDeleteTask }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  const columnTasks = tasks.filter((task) => task.columnId === id);

  return (
    <div
      ref={setNodeRef}
      className={cn("rounded p-3", isOver && "border-2 border-blue-500")}
    >
      <h2 className="mb-2 text-lg font-medium">{title}</h2>
      <SortableContext
        items={columnTasks.map((task) => task.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-grow">
          {columnTasks.map((task) => (
            <SortableItem key={task.id} task={task} onDelete={onDeleteTask} />
          ))}
          {columnTasks.length === 0 && (
            <div className="text-muted-foreground flex gap-2">
              <PartyPopper />
              <span>タスクはありません</span>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

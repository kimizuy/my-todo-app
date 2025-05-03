import type { ColumnId, Task } from ".";
import { SortableItem } from "./sortable-item";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { PartyPopper } from "lucide-react";

interface ColumnProps {
  id: ColumnId;
  title: string;
  tasks: Task[];
  onDeleteTask: (taskId: string) => void;
}

export function Column({ id, title, tasks, onDeleteTask }: ColumnProps) {
  const { setNodeRef } = useDroppable({
    id,
  });

  return (
    <div>
      <h2>{title}</h2>
      <div ref={setNodeRef} className="mt-4 rounded border p-3">
        <SortableContext
          items={tasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid gap-2">
            {tasks.map((task) => (
              <SortableItem key={task.id} task={task} onDelete={onDeleteTask} />
            ))}
            {tasks.length === 0 && (
              <div className="text-muted-foreground flex min-h-[58px] items-center gap-2">
                <PartyPopper />
                <span>タスクはありません</span>
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

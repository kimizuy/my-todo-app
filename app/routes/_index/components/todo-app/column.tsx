import type { ColumnId, Task } from ".";
import { SortableItem } from "./sortable-item";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { PartyPopper } from "lucide-react";
import { Button } from "~/components/ui/button";

interface ColumnProps {
  id: ColumnId;
  title: string;
  tasks: Task[];
  onDeleteTask: (taskId: string) => void;
  onCompleteTask: (taskId: string) => void;
  onArchiveAll?: () => void;
}

export function Column({
  id,
  title,
  tasks,
  onDeleteTask,
  onCompleteTask,
  onArchiveAll,
}: ColumnProps) {
  const { setNodeRef } = useDroppable({
    id,
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2>{title}</h2>
        {id === "done" && tasks.length > 0 && onArchiveAll && (
          <Button
            variant="outline"
            size="sm"
            onClick={onArchiveAll}
            className="text-xs"
          >
            すべてアーカイブする
          </Button>
        )}
      </div>
      <div ref={setNodeRef} className="mt-4 rounded border p-3">
        <SortableContext
          items={tasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid gap-2">
            {tasks.map((task) => (
              <SortableItem
                key={task.id}
                task={task}
                onDelete={onDeleteTask}
                onComplete={onCompleteTask}
              />
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

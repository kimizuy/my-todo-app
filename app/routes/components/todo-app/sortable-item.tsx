import type { Task } from ".";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

interface SortableItemProps {
  task: Task;
  onDelete: (taskId: string) => void;
}

export function SortableItem({ task, onDelete }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(task.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "my-1 flex cursor-grab items-center justify-between rounded border p-3",
        isDragging && "opacity-50",
      )}
      {...attributes}
      {...listeners}
    >
      <div>{task.content}</div>
      <Button variant="ghost" size="sm" onClick={handleDelete}>
        <Trash2 className="text-destructive" />
        <span className="sr-only">削除</span>
      </Button>
    </div>
  );
}

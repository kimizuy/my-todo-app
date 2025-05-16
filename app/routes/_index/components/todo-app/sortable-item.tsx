import type { Task } from ".";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Trash2, CheckCircle } from "lucide-react";
import type { KeyboardEvent } from "react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

interface SortableItemProps {
  task: Task;
  onDelete: (taskId: string) => void;
  onComplete: (taskId: string) => void;
}

export function SortableItem({
  task,
  onDelete,
  onComplete,
}: SortableItemProps) {
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

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    onDelete(task.id);
  }

  function handleComplete(e: React.MouseEvent) {
    e.stopPropagation();
    onComplete(task.id);
  }

  function handleDeleteKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.stopPropagation();
      e.preventDefault();
      onDelete(task.id);
    }
  }

  function handleCompleteKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.stopPropagation();
      e.preventDefault();
      onComplete(task.id);
    }
  }

  const showCompleteButton = task.columnId !== "done";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex cursor-grab items-center justify-between rounded border p-3",
        isDragging && "opacity-50",
      )}
      {...attributes}
      {...listeners}
    >
      <div>{task.content}</div>
      <div className="flex gap-1">
        {showCompleteButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleComplete}
            onKeyDown={handleCompleteKeyDown}
            title="完了にする"
          >
            <CheckCircle className="text-green-500" />
            <span className="sr-only">完了</span>
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          onKeyDown={handleDeleteKeyDown}
          title="削除する"
        >
          <Trash2 className="text-destructive" />
          <span className="sr-only">削除</span>
        </Button>
      </div>
    </div>
  );
}

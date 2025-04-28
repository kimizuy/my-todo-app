import type { Task } from ".";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "~/lib/utils";

interface SortableItemProps {
  task: Task;
}

export function SortableItem({ task }: SortableItemProps) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "my-1 cursor-grab rounded border p-3",
        isDragging && "opacity-50",
      )}
      {...attributes}
      {...listeners}
    >
      {task.content}
    </div>
  );
}

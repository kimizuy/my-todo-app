import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import DOMPurify from "dompurify";
import { CheckCircle, Trash2 } from "lucide-react";
import { marked } from "marked";
import type { KeyboardEvent } from "react";
import { Button } from "~/components/ui/button";
import { cn, formatDate } from "~/lib/utils";
import type { Task } from "../types";

interface Props {
  task: Task;
  onDelete: (taskId: string) => void;
  onComplete: (taskId: string) => void;
}

export function Item({ task, onDelete, onComplete }: Props) {
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
        "flex cursor-grab items-center justify-between gap-1 rounded border p-3",
        isDragging && "opacity-50",
      )}
      {...attributes}
      {...listeners}
    >
      <TaskContent task={task} />
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

const parseMarkdown = (content: string): string => {
  const html = marked.parse(content, {
    breaks: true,
    async: false,
  });
  return DOMPurify.sanitize(html);
};

interface TaskContentProps {
  task: Task;
}

export function TaskContent({ task }: TaskContentProps) {
  return (
    <div className="flex flex-col gap-1">
      <div
        className="prose dark:prose-invert text-primary prose-p:text-primary prose-headings:text-primary prose-li:text-primary prose-strong:text-primary prose-em:text-primary prose-a:text-primary wrap-anywhere"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Content is sanitized with DOMPurify
        dangerouslySetInnerHTML={{ __html: parseMarkdown(task.content) }}
      />
      {task.createdAt && ( // 古いデータは createdAt が存在しない可能性があるため
        <time className="text-muted-foreground text-xs">
          {formatDate(task.createdAt)}
        </time>
      )}
    </div>
  );
}

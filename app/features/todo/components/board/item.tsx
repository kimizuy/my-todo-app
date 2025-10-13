import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CheckCircle, Trash2 } from "lucide-react";
import type { KeyboardEvent } from "react";
import { parseContent } from "~/features/todo/lib/parse-content";
import type { Task } from "~/features/todo/schema";
import { Button } from "~/shared/components/shadcn-ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/shared/components/shadcn-ui/dialog";
import { cn } from "~/shared/utils/cn";
import { formatDate } from "~/shared/utils/format-date";

interface Props {
  task: Task;
  columnTitle: string;
  onDelete: (taskId: string) => void;
  onComplete: (taskId: string) => void;
}

export function Item({ task, columnTitle, onDelete, onComplete }: Props) {
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

  function handleCompleteKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.stopPropagation();
      e.preventDefault();
      onComplete(task.id);
    }
  }

  const showCompleteButton = task.columnId !== "done";

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex cursor-grab items-center justify-between gap-1 rounded border p-3",
        isDragging && "opacity-50",
      )}
      aria-label={`${task.content.replace(/<[^>]*>/g, "").slice(0, 50)}、${columnTitle}`}
      {...attributes}
      {...listeners}
    >
      <TaskContent task={task} />
      {/* relativeを追加してボタン内の.sr-only要素（position: absolute）の基準点を設定 */}
      {/* これがないと.sr-only要素が画面外に配置され、HTMLドキュメントの高さが拡張されてボード下部に余白が生じる */}
      <div className="relative flex gap-1">
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
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => e.stopPropagation()}
              title="削除する"
            >
              <Trash2 className="text-destructive" />
              <span className="sr-only">削除</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>タスクを削除しますか？</DialogTitle>
              <DialogDescription>この操作は取り消せません。</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">キャンセル</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button variant="destructive" onClick={handleDelete}>
                  削除
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </article>
  );
}

interface TaskContentProps {
  task: Task;
}

export function TaskContent({ task }: TaskContentProps) {
  const parsedContent = parseContent(task.content);

  return (
    <div className="flex flex-col gap-2">
      <div
        className="prose dark:prose-invert wrap-anywhere"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Content is sanitized with DOMPurify
        dangerouslySetInnerHTML={{ __html: parsedContent }}
      />
      {task.createdAt && ( // 古いデータは createdAt が存在しない可能性があるため
        <time className="text-muted-foreground text-xs">
          {formatDate(task.createdAt)}
        </time>
      )}
    </div>
  );
}

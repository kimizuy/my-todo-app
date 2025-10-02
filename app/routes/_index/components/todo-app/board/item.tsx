import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import DOMPurify from "isomorphic-dompurify";
import { CheckCircle, Trash2 } from "lucide-react";
import { marked } from "marked";
import { type KeyboardEvent, useMemo } from "react";
import { Button } from "~/components/ui/button";
import { cn, formatDate } from "~/lib/utils";
import type { Task } from "../types";

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
    </article>
  );
}

interface TaskContentProps {
  task: Task;
}

export function TaskContent({ task }: TaskContentProps) {
  const parsedContent = useMemo(() => {
    // カスタムレンダラーを設定
    const renderer = new marked.Renderer();

    // リンクのレンダリングをカスタマイズ
    renderer.link = ({ href, title, tokens }) => {
      // tokensからテキストを取得（markdown内のリンクテキスト）
      let text = href;
      if (tokens.length > 0) {
        text = tokens.map((token) => token.raw || "").join("");
      }

      const displayText = text === href ? truncateUrl(href) : text;
      const titleAttr = title ? ` title="${title}"` : ` title="${href}"`;
      return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${displayText}</a>`;
    };

    const html = marked.parse(task.content, {
      breaks: true,
      async: false,
      renderer,
    });
    return DOMPurify.sanitize(html);
  }, [task.content]);

  return (
    <div className="flex flex-col gap-2">
      <div
        className="prose dark:prose-invert text-primary prose-p:text-primary prose-headings:text-primary prose-li:text-primary prose-strong:text-primary prose-em:text-primary prose-a:text-primary wrap-anywhere"
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

function truncateUrl(url: string, maxLength = 40): string {
  if (url.length <= maxLength) return url;

  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const pathAndQuery = urlObj.pathname + urlObj.search + urlObj.hash;

    const availableLength = maxLength - domain.length - 3; // 3 for "..."

    if (availableLength > 10 && pathAndQuery.length > availableLength) {
      const truncatedPath = pathAndQuery.substring(0, availableLength);
      return `${domain}${truncatedPath}...`;
    }

    if (domain.length > maxLength - 3) {
      return `${domain.substring(0, maxLength - 3)}...`;
    }

    return `${domain}...`;
  } catch {
    // URLパースに失敗した場合は単純に切り詰める
    return `${url.substring(0, maxLength - 3)}...`;
  }
}

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { PartyPopper, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import {
  clearDraft,
  loadDraft,
  saveDraft,
} from "~/features/todo/lib/draft-storage";
import type { ColumnId, Task } from "~/features/todo/schema";
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
import { Textarea } from "~/shared/components/shadcn-ui/textarea";
import { Item } from "./item";

interface Props {
  id: ColumnId;
  title: string;
  tasks: Task[];
  totalCount?: number;
  onDeleteTask: (taskId: string) => void;
  onCompleteTask: (taskId: string) => void;
  onArchiveAll?: () => void;
  onAddTask: (content: string) => void;
}

export function Column({
  id,
  title,
  tasks,
  totalCount,
  onDeleteTask,
  onCompleteTask,
  onArchiveAll,
  onAddTask,
}: Props) {
  const { setNodeRef } = useDroppable({
    id,
  });

  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  // Dialogが開いた時に下書きを読み込む
  useEffect(() => {
    if (isOpen) {
      const draft = loadDraft(id);
      if (draft) {
        setInputValue(draft);
      }
    }
  }, [isOpen, id]);

  // Dialogが閉じた時に下書きを保存
  useEffect(() => {
    if (!isOpen && inputValue.trim()) {
      saveDraft(id, inputValue);
    }
  }, [isOpen, id, inputValue]);

  const handleAddTask = () => {
    if (!inputValue.trim()) return;
    onAddTask(inputValue.trim());
    setInputValue("");
    clearDraft(id); // タスク追加成功時に下書きをクリア
    setIsOpen(false);
  };

  return (
    <div className="bg-background relative flex h-full min-w-80 flex-1 flex-col rounded-md border">
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{title}</span>
          <span className="bg-muted text-muted-foreground rounded px-2 py-1 text-xs">
            {totalCount ?? tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`${title}にタスクを追加`}
              >
                <Plus className="size-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground rounded px-3 py-1 text-sm font-bold">
                    {title}
                  </span>
                  <span>にタスクを追加</span>
                </DialogTitle>
              </DialogHeader>
              <Textarea
                placeholder="タスクを入力（マークダウン対応）"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="min-h-[100px]"
                autoFocus
                aria-label="タスクの内容"
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">キャンセル</Button>
                </DialogClose>
                <Button onClick={handleAddTask} aria-label="タスクを追加">
                  追加
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div
        ref={setNodeRef}
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3"
      >
        {tasks.length > 0 ? (
          <SortableContext
            items={tasks.map((task) => task.id)}
            strategy={verticalListSortingStrategy}
          >
            {tasks.map((task) => (
              <Item
                key={task.id}
                task={task}
                columnTitle={title}
                onDelete={onDeleteTask}
                onComplete={onCompleteTask}
              />
            ))}
          </SortableContext>
        ) : (
          <div className="text-muted-foreground flex flex-1 items-center justify-center gap-2">
            <PartyPopper />
            <span>タスクはありません</span>
          </div>
        )}
      </div>
      {id === "done" && onArchiveAll && (
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
              disabled={tasks.length === 0}
              className="absolute right-3 bottom-3 text-xs opacity-50 transition-opacity hover:opacity-100 focus-visible:opacity-100"
            >
              完了したタスクをアーカイブ
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>タスクをアーカイブしますか？</DialogTitle>
              <DialogDescription>
                完了したタスクをすべてアーカイブします。この操作は取り消せません。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">キャンセル</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button variant="destructive" onClick={onArchiveAll}>
                  アーカイブ
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

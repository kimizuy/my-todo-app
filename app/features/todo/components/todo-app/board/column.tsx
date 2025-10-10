import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { PartyPopper } from "lucide-react";
import type { ColumnId, Task } from "~/features/todo/schema";
import { Button } from "~/shared/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/shared/components/ui/dialog";
import { Item } from "./item";

interface Props {
  id: ColumnId;
  title: string;
  tasks: Task[];
  totalCount?: number;
  onDeleteTask: (taskId: string) => void;
  onCompleteTask: (taskId: string) => void;
  onArchiveAll?: () => void;
}

export function Column({
  id,
  title,
  tasks,
  totalCount,
  onDeleteTask,
  onCompleteTask,
  onArchiveAll,
}: Props) {
  const { setNodeRef } = useDroppable({
    id,
  });

  return (
    <div className="bg-background flex h-full min-w-80 flex-1 flex-col rounded-md border">
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{title}</span>
          <span className="bg-muted text-muted-foreground rounded px-2 py-1 text-xs">
            {totalCount ?? tasks.length}
          </span>
        </div>
        {id === "done" && tasks.length > 0 && onArchiveAll && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm" className="text-xs">
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
    </div>
  );
}

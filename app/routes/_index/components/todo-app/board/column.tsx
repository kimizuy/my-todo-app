import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { PartyPopper } from "lucide-react";
import { memo } from "react";
import { Button } from "~/components/ui/button";
import type { ColumnId, Task } from "../types";
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

export const Column = memo(function Column({
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
          <Button
            variant="destructive"
            size="sm"
            onClick={onArchiveAll}
            className="text-xs"
          >
            完了したタスクをアーカイブ
          </Button>
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
});

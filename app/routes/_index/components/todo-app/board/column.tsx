import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { PartyPopper } from "lucide-react";
import { Button } from "~/components/ui/button";
import type { ColumnId, Task } from "../types";
import { Item } from "./item";

interface Props {
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
}: Props) {
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
      <div
        ref={setNodeRef}
        className="mt-4 grid min-h-[100px] place-items-center rounded border p-3"
      >
        {tasks.length > 0 ? (
          <SortableContext
            items={tasks.map((task) => task.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid w-full gap-2">
              {tasks.map((task) => (
                <Item
                  key={task.id}
                  task={task}
                  onDelete={onDeleteTask}
                  onComplete={onCompleteTask}
                />
              ))}
            </div>
          </SortableContext>
        ) : (
          <div className="text-muted-foreground flex items-center justify-center gap-2">
            <PartyPopper />
            <span>タスクはありません</span>
          </div>
        )}
      </div>
    </div>
  );
}

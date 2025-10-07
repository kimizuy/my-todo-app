import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { archivedTasks, tasks } from "~/db/schema";
import { requireAuth } from "~/lib/auth.server";
import type { Route } from "./+types/route";
import { TodoApp } from "./components/todo-app";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Daily Tasks" },
    { name: "description", content: "Manage your daily tasks effectively!" },
  ];
}

// タスク一覧取得（型安全）
export async function loader({ request, context }: Route.LoaderArgs) {
  const user = await requireAuth(request, context);
  const db = drizzle(context.cloudflare.env.DB);

  // Drizzle の型安全なクエリ
  const userTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, user.id))
    .orderBy(desc(tasks.createdAt))
    .all();

  return { tasks: userTasks, user };
}

// タスク作成・更新・削除・アーカイブ
export async function action({ request, context }: Route.ActionArgs) {
  const user = await requireAuth(request, context);
  const db = drizzle(context.cloudflare.env.DB);

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  switch (intent) {
    case "create": {
      const content = formData.get("content") as string;

      await db.insert(tasks).values({
        id: `task-${Date.now()}`,
        userId: user.id,
        content,
        columnId: "uncategorized",
        createdAt: new Date().toISOString(),
      });

      return { success: true };
    }

    case "update": {
      const taskId = formData.get("taskId") as string;
      const columnId = formData.get("columnId") as
        | "uncategorized"
        | "do-today"
        | "do-not-today"
        | "done";

      await db.update(tasks).set({ columnId }).where(eq(tasks.id, taskId));

      return { success: true };
    }

    case "delete": {
      const taskId = formData.get("taskId") as string;

      await db.delete(tasks).where(eq(tasks.id, taskId));

      return { success: true };
    }

    case "archive": {
      // 完了タスクを取得
      const doneTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.columnId, "done"))
        .all();

      if (doneTasks.length > 0) {
        const archivedAt = new Date().toISOString();

        // アーカイブテーブルに挿入
        await db.insert(archivedTasks).values(
          doneTasks.map((task) => ({
            id: task.id,
            userId: task.userId,
            content: task.content,
            columnId: task.columnId,
            createdAt: task.createdAt,
            archivedAt,
          })),
        );

        // 完了タスクを削除
        await db.delete(tasks).where(eq(tasks.columnId, "done"));
      }

      return { success: true };
    }

    case "batch-update": {
      // 複数タスクの順序更新
      const tasksData = JSON.parse(formData.get("tasks") as string);

      for (const task of tasksData) {
        await db
          .update(tasks)
          .set({ columnId: task.columnId })
          .where(eq(tasks.id, task.id));
      }

      return { success: true };
    }

    default:
      return Response.json({ error: "Invalid intent" }, { status: 400 });
  }
}

export default function Home() {
  return <TodoApp />;
}

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { redirect } from "react-router";
import type { ColumnId } from "~/db/schema";
import { users } from "~/db/schema";
import { requireAuth } from "~/lib/auth.server";
import { createUserDb } from "~/lib/db.server";
import type { Route } from "./+types/route";
import { TodoApp } from "./components/todo-app";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Daily Tasks" },
    { name: "description", content: "Manage your daily tasks effectively!" },
  ];
}

// タスク一覧取得
export async function loader({ request, context }: Route.LoaderArgs) {
  const user = await requireAuth(request, context);

  // DBからユーザー情報を取得してメール認証状態を確認
  const db = drizzle(context.cloudflare.env.DB);
  const dbUser = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .get();

  // メール未認証の場合は認証待ち画面にリダイレクト
  if (dbUser && !dbUser.emailVerified) {
    throw redirect("/verify-email-pending");
  }

  const userDb = createUserDb(context.cloudflare.env.DB, user.id);

  // UserScopedDbで自動的にuserIdでフィルタリング
  const userTasks = await userDb.getTasks();

  return { tasks: userTasks, user };
}

// タスク作成・更新・削除・アーカイブ
export async function action({ request, context }: Route.ActionArgs) {
  const user = await requireAuth(request, context);
  const userDb = createUserDb(context.cloudflare.env.DB, user.id);

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  switch (intent) {
    case "create": {
      const content = formData.get("content") as string;

      await userDb.createTask({
        id: `task-${Date.now()}`,
        content,
        columnId: "uncategorized",
        createdAt: new Date().toISOString(),
      });

      return { success: true };
    }

    case "update": {
      const taskId = formData.get("taskId") as string;
      const columnId = formData.get("columnId") as ColumnId;
      const orderStr = formData.get("order") as string | null;
      const order = orderStr ? Number.parseInt(orderStr, 10) : undefined;

      await userDb.updateTask(taskId, { columnId, order });

      return { success: true };
    }

    case "delete": {
      const taskId = formData.get("taskId") as string;

      await userDb.deleteTask(taskId);

      return { success: true };
    }

    case "archive": {
      await userDb.archiveDoneTasks();

      return { success: true };
    }

    case "batch-update": {
      const tasksData = JSON.parse(formData.get("tasks") as string);

      await userDb.batchUpdateTasks(tasksData);

      return { success: true };
    }

    default:
      return Response.json({ error: "Invalid intent" }, { status: 400 });
  }
}

export default function Home() {
  return <TodoApp />;
}

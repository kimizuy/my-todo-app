import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { useLoaderData, useNavigate } from "react-router";
import { usePasskeyRegistration } from "~/features/auth/hooks/usePasskeyRegistration";
import { requireEmailVerified } from "~/features/auth/lib/auth-service";
import { passkeys } from "~/features/auth/schema";
import { Board } from "~/features/todo/components/board";
import { Filter } from "~/features/todo/components/filter";
import { useTasks } from "~/features/todo/components/hooks";
import { createUserDb } from "~/features/todo/lib/todo-service";
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
import type { Route } from "./+types/_index";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Daily Tasks" },
    { name: "description", content: "Manage your daily tasks effectively!" },
  ];
}

// タスク一覧取得
export async function loader({ request, context }: Route.LoaderArgs) {
  const user = await requireEmailVerified(request, context);

  const db = drizzle(context.cloudflare.env.DB);
  const userDb = createUserDb(context.cloudflare.env.DB, user.id);

  // UserScopedDbで自動的にuserIdでフィルタリング
  const userTasks = await userDb.getTasks();

  // パスキーの有無をチェック
  const userPasskey = await db
    .select()
    .from(passkeys)
    .where(eq(passkeys.userId, user.id))
    .limit(1)
    .get();
  const hasPasskey = !!userPasskey;

  // クエリパラメータをチェック
  const url = new URL(request.url);
  const promptPasskey = url.searchParams.get("prompt_passkey") === "true";

  return { tasks: userTasks, user, hasPasskey, promptPasskey };
}

// タスク作成・更新・削除・アーカイブ
export async function action({ request, context }: Route.ActionArgs) {
  const user = await requireEmailVerified(request, context);
  const userDb = createUserDb(context.cloudflare.env.DB, user.id);

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  switch (intent) {
    case "create": {
      const content = formData.get("content") as string;
      const columnId =
        (formData.get("columnId") as ColumnId) || "uncategorized";

      await userDb.createTask({
        id: `task-${Date.now()}`,
        content,
        columnId,
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
  const loaderData = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { tasks, setTasks, fetcher } = useTasks();
  const [filterText, setFilterText] = useState<string>("");

  const [showPasskeyDialog, setShowPasskeyDialog] = useState(false);

  const {
    register: handleRegisterPasskey,
    status: passkeyStatus,
    error: passkeyError,
  } = usePasskeyRegistration({
    onSuccess: () => {
      setTimeout(() => {
        setShowPasskeyDialog(false);
      }, 2000);
    },
  });

  useEffect(() => {
    if (loaderData.promptPasskey && !loaderData.hasPasskey) {
      setShowPasskeyDialog(true);
      // クエリパラメータをクリア
      navigate("/", { replace: true });
    }
  }, [loaderData.promptPasskey, loaderData.hasPasskey, navigate]);

  const handleAddTaskFromForm = (content: string, columnId: ColumnId) => {
    // 最大のorder値を取得
    const maxOrder = tasks.reduce(
      (max: number, task: Task) => Math.max(max, task.order),
      -1,
    );

    const newTask: Task = {
      id: `task-${Date.now()}`,
      userId: 0, // サーバーからの応答で正しいuserIdに更新される
      content,
      columnId,
      order: maxOrder + 1,
      createdAt: new Date().toISOString(),
      archivedAt: null,
    };

    // 楽観的更新
    setTasks((prev) => [newTask, ...prev]);

    // サーバーに送信
    const formData = new FormData();
    formData.append("intent", "create");
    formData.append("content", content);
    formData.append("columnId", columnId);
    fetcher.submit(formData, { method: "post" });
  };

  const handleResetTasks = () => {
    setTasks((prevTasks) => {
      // 今日やる/やらないのタスクを分類
      const doTodayTasks = prevTasks.filter(
        (task) => task.columnId === "do-today",
      );
      const doNotTodayTasks = prevTasks.filter(
        (task) => task.columnId === "do-not-today",
      );
      const otherTasks = prevTasks.filter(
        (task) =>
          task.columnId !== "do-today" && task.columnId !== "do-not-today",
      );

      // リセット対象のタスクを未分類に変更
      const resetDoTodayTasks = doTodayTasks.map((task) => ({
        ...task,
        columnId: "uncategorized" as const,
      }));
      const resetDoNotTodayTasks = doNotTodayTasks.map((task) => ({
        ...task,
        columnId: "uncategorized" as const,
      }));

      // 他のタスクの中の未分類タスクを分離
      const uncategorizedTasks = otherTasks.filter(
        (task) => task.columnId === "uncategorized",
      );
      const nonUncategorizedTasks = otherTasks.filter(
        (task) => task.columnId !== "uncategorized",
      );

      // 最終的な順序: 非未分類 + 今日やる + 今日やらない + 既存の未分類
      const updatedUncategorizedTasks = [
        ...resetDoTodayTasks,
        ...resetDoNotTodayTasks,
        ...uncategorizedTasks,
      ];

      // 未分類タスクにorderを設定
      const tasksWithOrder = updatedUncategorizedTasks.map((task, index) => ({
        ...task,
        order: index,
      }));

      const allTasks = [...nonUncategorizedTasks, ...tasksWithOrder];

      // サーバーに送信（batch-update）
      const formData = new FormData();
      formData.append("intent", "batch-update");
      formData.append("tasks", JSON.stringify(allTasks));
      fetcher.submit(formData, { method: "post" });

      return allTasks;
    });
  };

  const handleDeleteTask = (taskId: string) => {
    // 楽観的更新
    setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));

    // サーバーに送信
    const formData = new FormData();
    formData.append("intent", "delete");
    formData.append("taskId", taskId);
    fetcher.submit(formData, { method: "post" });
  };

  const handleCompleteTask = (taskId: string) => {
    let newOrder = 0;

    // 楽観的更新
    setTasks((prevTasks) => {
      const taskToComplete = prevTasks.find((task) => task.id === taskId);
      if (!taskToComplete) return prevTasks;

      const tasksWithoutCompleted = prevTasks.filter(
        (task) => task.id !== taskId,
      );

      // 完了カラムの最小のorder値を取得して、それより小さい値を設定
      const doneColumnTasks = prevTasks.filter(
        (task) => task.columnId === "done",
      );
      const minOrder = doneColumnTasks.reduce(
        (min, task) => Math.min(min, task.order),
        0,
      );

      newOrder = minOrder - 1;

      const completedTask: Task = {
        ...taskToComplete,
        columnId: "done",
        order: newOrder,
      };
      return [completedTask, ...tasksWithoutCompleted];
    });

    // サーバーに送信
    const formData = new FormData();
    formData.append("intent", "update");
    formData.append("taskId", taskId);
    formData.append("columnId", "done");
    formData.append("order", newOrder.toString());
    fetcher.submit(formData, { method: "post" });
  };

  const handleArchiveAll = () => {
    // 楽観的更新
    setTasks((prevTasks) =>
      prevTasks.filter((task) => task.columnId !== "done"),
    );

    // サーバーに送信
    const formData = new FormData();
    formData.append("intent", "archive");
    fetcher.submit(formData, { method: "post" });
  };

  const handleTaskUpdate = (updatedTasks: Task[]) => {
    // 楽観的更新
    setTasks(updatedTasks);

    // サーバーに送信（batch-update）
    const formData = new FormData();
    formData.append("intent", "batch-update");
    formData.append("tasks", JSON.stringify(updatedTasks));
    fetcher.submit(formData, { method: "post" });
  };

  const filteredTasks = !filterText.trim()
    ? tasks
    : tasks.filter((task: Task) =>
        task.content.toLowerCase().includes(filterText.toLowerCase()),
      );

  return (
    <>
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex-1">
            <Filter value={filterText} onChange={setFilterText} />
          </div>
          <Dialog>
            <DialogTrigger asChild className="sm:hidden">
              <Button variant="outline" size="icon">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogTrigger asChild className="hidden sm:inline-flex">
              <Button variant="outline" className="text-xs">
                今日のタスクをリセット
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>タスクをリセットしますか？</DialogTitle>
                <DialogDescription>
                  今日やる/やらないのタスクを未分類に戻します。
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">キャンセル</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button onClick={handleResetTasks}>リセット</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="-mx-4 flex-1 overflow-hidden">
          <Board
            allTasks={tasks}
            tasks={filteredTasks}
            onTaskUpdate={handleTaskUpdate}
            onDeleteTask={handleDeleteTask}
            onCompleteTask={handleCompleteTask}
            onArchiveAll={handleArchiveAll}
            onAddTask={handleAddTaskFromForm}
          />
        </div>
      </div>

      <Dialog open={showPasskeyDialog} onOpenChange={setShowPasskeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>パスキーを登録しますか？</DialogTitle>
            <DialogDescription>
              パスキーを登録すると、次回からパスワード入力なしで簡単にログインできます。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg bg-blue-50 p-4">
              <h3 className="mb-2 text-sm font-semibold text-blue-900">
                パスキーのメリット
              </h3>
              <ul className="space-y-1 text-sm text-blue-800">
                <li>• 生体認証やPINで簡単ログイン</li>
                <li>• パスワード入力が不要</li>
                <li>• より安全な認証方法</li>
              </ul>
            </div>

            {passkeyError && (
              <div className="rounded-lg bg-red-50 p-4">
                <p className="text-sm text-red-800">{passkeyError}</p>
              </div>
            )}

            {passkeyStatus === "success" && (
              <div className="rounded-lg bg-green-50 p-4">
                <p className="text-sm text-green-800">
                  パスキーの登録が完了しました！
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPasskeyDialog(false)}
              disabled={passkeyStatus === "registering"}
            >
              後で登録
            </Button>
            <Button
              onClick={handleRegisterPasskey}
              disabled={
                passkeyStatus === "registering" || passkeyStatus === "success"
              }
            >
              {passkeyStatus === "registering"
                ? "登録中..."
                : passkeyStatus === "success"
                  ? "登録完了"
                  : "登録する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

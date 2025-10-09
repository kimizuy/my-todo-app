import { Link, redirect } from "react-router";
import { getAuthUser } from "~/features/auth/lib/auth-service";
import { Button } from "~/shared/components/ui/button";
import type { Route } from "./+types/route";

export async function loader({ request, context }: Route.LoaderArgs) {
  const user = await getAuthUser(request, context);
  if (user) {
    throw redirect("/");
  }
  return null;
}

export default function Auth() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 rounded-lg border p-8">
        <div className="text-center">
          <h1 className="mb-2 text-3xl font-bold">Daily Tasks</h1>
          <p className="text-muted-foreground">タスク管理を始めましょう</p>
        </div>

        <div className="space-y-4">
          <Button asChild className="w-full" size="lg">
            <Link to="/login">ログイン</Link>
          </Button>

          <Button asChild variant="outline" className="w-full" size="lg">
            <Link to="/register">新規登録</Link>
          </Button>
        </div>

        <div className="rounded-lg bg-blue-50 p-4">
          <p className="text-sm text-blue-800">
            アカウントを作成すると、すべてのデバイスでタスクを同期できます。
          </p>
        </div>
      </div>
    </div>
  );
}

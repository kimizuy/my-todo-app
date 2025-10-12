import { redirect } from "react-router";
import { getAuthUser } from "~/features/auth/lib/auth-service";
import { deleteCookie } from "~/shared/utils/cookies";
import type { Route } from "./+types/api.auth.logout";

export async function action({ request, context }: Route.ActionArgs) {
  // 認証チェック（ログイン済みかどうかを確認）
  await getAuthUser(request, context);

  const cookie = deleteCookie("auth_token");

  return redirect("/login", {
    headers: { "Set-Cookie": cookie },
  });
}

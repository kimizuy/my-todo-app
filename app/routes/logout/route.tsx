import { redirect } from "react-router";
import { deleteCookie } from "~/shared/lib/cookies";
import type { Route } from "./+types/route";

export async function action(_args: Route.ActionArgs) {
  const cookie = deleteCookie("auth_token");

  return redirect("/login", {
    headers: { "Set-Cookie": cookie },
  });
}

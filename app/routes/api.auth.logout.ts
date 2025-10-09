import { type ActionFunctionArgs, redirect } from "react-router";
import { deleteCookie } from "~/lib/cookies.server";

export async function action(_args: ActionFunctionArgs) {
  const cookie = deleteCookie("auth_token");

  return redirect("/login", {
    headers: { "Set-Cookie": cookie },
  });
}

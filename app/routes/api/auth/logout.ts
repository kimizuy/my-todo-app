import type { ActionFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { deleteCookie } from "~/lib/cookies.server";

export async function action({ request }: ActionFunctionArgs) {
  const cookie = deleteCookie("auth_token");

  return redirect("/login", {
    headers: { "Set-Cookie": cookie },
  });
}

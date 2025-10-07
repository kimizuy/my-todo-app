import type { ActionFunctionArgs } from "react-router";
import { deleteCookie } from "~/lib/cookies.server";

export async function action(_args: ActionFunctionArgs) {
  const cookie = deleteCookie("auth_token");

  return Response.json(
    { success: true },
    { headers: { "Set-Cookie": cookie } },
  );
}

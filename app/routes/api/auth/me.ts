import type { LoaderFunctionArgs } from "react-router";
import { getAuthUser } from "~/lib/auth.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const user = await getAuthUser(request, context);

  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  return Response.json({ user });
}

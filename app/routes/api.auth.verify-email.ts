import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { ActionFunctionArgs } from "react-router";
import { users } from "~/db/schema";
import { isTokenExpired } from "~/lib/token.server";

export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData();
  const token = formData.get("token") as string;

  if (!token) {
    return Response.json({ error: "Token is required" }, { status: 400 });
  }

  const db = drizzle(context.cloudflare.env.DB);

  // トークンでユーザーを検索
  const user = await db
    .select()
    .from(users)
    .where(eq(users.verificationToken, token))
    .get();

  if (!user) {
    return Response.json({ error: "Invalid token" }, { status: 400 });
  }

  // トークンの有効期限チェック
  if (isTokenExpired(user.verificationTokenExpiry)) {
    return Response.json({ error: "Token has expired" }, { status: 400 });
  }

  // メール認証完了
  await db
    .update(users)
    .set({
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiry: null,
    })
    .where(eq(users.id, user.id));

  return Response.json({
    success: true,
    message: "Email verified successfully",
  });
}

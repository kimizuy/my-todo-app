import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { ActionFunctionArgs } from "react-router";
import { users } from "~/db/schema";
import { createAuthService } from "~/lib/auth.server";
import { setCookie } from "~/lib/cookies.server";
import { hashPassword } from "~/lib/password.server";

export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // バリデーション
  if (!email || !password) {
    return Response.json(
      { error: "Email and password are required" },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return Response.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }

  const db = drizzle(context.cloudflare.env.DB);

  // 既存ユーザーチェック（型安全）
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .get();

  if (existingUser) {
    return Response.json({ error: "Email already exists" }, { status: 400 });
  }

  // パスワードハッシュ化
  const passwordHash = await hashPassword(password);

  // ユーザー作成（型安全）
  const [newUser] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
    })
    .returning({ id: users.id, email: users.email });

  if (!newUser) {
    return Response.json({ error: "Failed to create user" }, { status: 500 });
  }

  // セッション作成
  const auth = createAuthService(context);
  const token = await auth.createSession({
    id: newUser.id,
    email: newUser.email,
  });

  // Cookie 設定
  const cookie = setCookie("auth_token", token);

  return Response.json(
    { success: true, user: newUser },
    { headers: { "Set-Cookie": cookie } },
  );
}

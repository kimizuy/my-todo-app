import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { ActionFunctionArgs } from "react-router";
import { users } from "~/db/schema";
import { createAuthService } from "~/lib/auth.server";
import { setCookie } from "~/lib/cookies.server";
import { verifyPassword } from "~/lib/password.server";

export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return Response.json(
      { error: "Email and password are required" },
      { status: 400 },
    );
  }

  const db = drizzle(context.cloudflare.env.DB);

  // ユーザー検索（型安全）
  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .get();

  if (!user) {
    return Response.json(
      { error: "Invalid email or password" },
      { status: 401 },
    );
  }

  // パスワード検証
  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return Response.json(
      { error: "Invalid email or password" },
      { status: 401 },
    );
  }

  // メール認証チェック（厳格な認証）
  if (!user.emailVerified) {
    return Response.json(
      {
        error: "Email not verified",
        code: "EMAIL_NOT_VERIFIED",
        message: "Please verify your email address before logging in",
      },
      { status: 403 },
    );
  }

  // セッション作成
  const auth = createAuthService(context);
  const token = await auth.createSession({ id: user.id, email: user.email });

  // Cookie 設定
  const cookie = setCookie("auth_token", token);

  return Response.json(
    { success: true, user: { id: user.id, email: user.email } },
    { headers: { "Set-Cookie": cookie } },
  );
}

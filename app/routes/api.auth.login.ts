import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { ActionFunctionArgs } from "react-router";
import { users } from "~/db/schema";
import { createAuthService } from "~/lib/auth.server";
import { setCookie } from "~/lib/cookies.server";
import {
  AuthenticationError,
  EmailNotVerifiedError,
  errorResponse,
  formatZodError,
} from "~/lib/errors.server";
import { verifyPassword } from "~/lib/password.server";
import { loginSchema } from "~/lib/validation.server";

export async function action({ request, context }: ActionFunctionArgs) {
  try {
    const formData = await request.formData();
    const rawData = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

    // バリデーション
    const validation = loginSchema.safeParse(rawData);
    if (!validation.success) {
      throw formatZodError(validation.error);
    }

    const { email, password } = validation.data;
    const db = drizzle(context.cloudflare.env.DB);

    // ユーザー検索
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .get();

    if (!user) {
      throw new AuthenticationError("Invalid email or password");
    }

    // パスワード検証
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new AuthenticationError("Invalid email or password");
    }

    // メール認証チェック
    if (!user.emailVerified) {
      throw new EmailNotVerifiedError();
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
  } catch (error) {
    return errorResponse(error);
  }
}

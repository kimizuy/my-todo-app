import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { AppLoadContext } from "react-router";
import { passkeys, users } from "~/features/auth/schema";

/**
 * メールアドレスでパスキーが登録されているかチェックするAPI
 * ログイン前に使用するため、認証は不要
 */
export async function loader({
  request,
  context,
}: {
  request: Request;
  context: AppLoadContext;
}) {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get("email");

    if (!email) {
      return Response.json({ hasPasskey: false });
    }

    const db = drizzle(context.cloudflare.env.DB);

    // ユーザーを検索
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .get();

    if (!user) {
      return Response.json({ hasPasskey: false });
    }

    // パスキーが登録されているかチェック
    const userPasskey = await db
      .select()
      .from(passkeys)
      .where(eq(passkeys.userId, user.id))
      .limit(1)
      .get();

    return Response.json({
      hasPasskey: !!userPasskey,
    });
  } catch (_error) {
    return Response.json({ hasPasskey: false }, { status: 500 });
  }
}

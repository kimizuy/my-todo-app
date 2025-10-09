import { drizzle } from "drizzle-orm/d1";
import type { LoaderFunctionArgs } from "react-router";
import { users } from "~/features/auth/schema";

export async function loader({ context }: LoaderFunctionArgs) {
  try {
    const d1 = context.cloudflare.env.DB;
    const db = drizzle(d1);

    // D1接続をテスト
    const result = await d1.prepare("SELECT 1 as test").first();

    // テーブル一覧を取得
    const tables = await d1
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
      )
      .all();

    // ユーザーテーブルの件数を取得
    const userCount = await db.select().from(users).all();

    return Response.json({
      status: "success",
      message: "D1 connection successful",
      test: result,
      tables: tables.results,
      userCount: userCount.length,
      env: {
        hasDB: !!d1,
        hasJWT: !!context.cloudflare.env.JWT_SECRET,
      },
    });
  } catch (error) {
    return Response.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}

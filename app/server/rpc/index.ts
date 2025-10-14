import { Hono } from "hono";
import type { Env } from "../../types/cloudflare";
import { googleOAuthRoutes } from "./routes/oauth-google";
import { passkeyRoutes } from "./routes/passkey";

/**
 * Hono RPCアプリケーション
 * 型安全なAPIエンドポイントを提供
 */
const app = new Hono<{ Bindings: Env }>()
  .basePath("/rpc")
  .route("/passkey", passkeyRoutes)
  .route("/oauth/google", googleOAuthRoutes);

/**
 * 型定義をエクスポート
 * クライアント側でこの型を使用して型安全なAPI呼び出しを実現
 */
export type AppType = typeof app;

export { app as rpcApp };

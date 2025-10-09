import { applyD1Migrations, env } from "cloudflare:test";

// マイグレーションを適用
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

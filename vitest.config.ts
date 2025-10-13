import path from "node:path";
import {
  defineWorkersProject,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineWorkersProject(async () => {
  const migrationsPath = path.join(__dirname, "migrations");
  const migrations = await readD1Migrations(migrationsPath);

  return {
    plugins: [tsconfigPaths()],
    resolve: {
      alias: {
        // Fix: @cloudflare/vitest-pool-workers cannot resolve tslib's complex exports field correctly.
        // Force use of ESM version to avoid "does not provide an export named 'default'" error.
        // This is required when using Hono with @hono/zod-validator which depends on tslib.
        tslib: "tslib/tslib.es6.js",
      },
    },
    test: {
      globals: true,
      includeSource: ["app/**/*.{ts,tsx}"],
      setupFiles: ["./test/setup.ts"],
      poolOptions: {
        workers: {
          singleWorker: true,
          wrangler: {
            configPath: "./wrangler.jsonc",
          },
          miniflare: {
            bindings: { TEST_MIGRATIONS: migrations },
          },
        },
      },
    },
  };
});

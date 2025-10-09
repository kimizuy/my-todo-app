import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./app/features/**/schema.ts",
  out: "./migrations",
  dialect: "sqlite",
});

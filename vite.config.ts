import { cloudflare } from "@cloudflare/vite-plugin";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import babel from "vite-plugin-babel";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    babel({
      babelConfig: {
        presets: [
          "@babel/preset-typescript",
          ["@babel/preset-react", { runtime: "automatic" }],
        ],
        plugins: ["babel-plugin-react-compiler"],
      },
      filter: /\.[jt]sx?$/,
      apply: "build", // Only apply React Compiler in production builds
    }),
    cloudflare({
      viteEnvironment: { name: "ssr" },
      persistState: true,
    }),
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
  ],
});

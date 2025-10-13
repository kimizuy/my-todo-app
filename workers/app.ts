import { createRequestHandler } from "react-router";
import { rpcApp } from "../app/server/rpc";

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: {
      env: Env;
      ctx: ExecutionContext;
    };
  }
}

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // /rpc/* へのリクエストはHonoで処理
    if (url.pathname.startsWith("/rpc")) {
      return rpcApp.fetch(request, env, ctx);
    }

    // その他のリクエストはReact Routerで処理
    return requestHandler(request, {
      cloudflare: { env, ctx },
    });
  },
} satisfies ExportedHandler<Env>;

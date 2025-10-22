import type { Route } from "./+types/root";
import "./app.css";
import { Check, ListTodo, Moon, Sun } from "lucide-react";
import { ThemeProvider, useTheme } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/react-router/v7";
import { useEffect } from "react";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  NavLink,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRevalidator,
  useRouteLoaderData,
} from "react-router";
import { createAuthService } from "~/features/auth/service";
import { Button } from "~/shared/components/shadcn-ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/shared/components/shadcn-ui/dropdown-menu";
import { SkipLink } from "~/shared/components/shadcn-ui/skip-link";
import { Toaster } from "~/shared/components/shadcn-ui/toaster";
import { UserMenu } from "~/shared/components/user-menu";
import { cn } from "~/shared/utils/cn";
import { setCookie } from "~/shared/utils/cookies";

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = createAuthService(context);
  const { user, newToken } = await auth.getUser(request);

  const url = new URL(request.url);
  const showMenu = url.pathname === "/" || url.pathname === "/archives";

  // スライディングセッション: 新しいトークンがあればCookieを更新
  if (newToken) {
    const headers = new Headers();
    headers.append("Set-Cookie", setCookie("auth_token", newToken));
    return Response.json({ user, showMenu }, { headers });
  }

  return { user, showMenu };
}

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useRouteLoaderData<typeof loader>("root");
  const user = data?.user;
  const showMenu = data?.showMenu ?? false;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider attribute="data-theme">
          <SkipLink href="#task-board">ボードへスキップ</SkipLink>
          <div className="flex h-screen flex-col overflow-hidden">
            <header className="bg-background flex items-center border-b px-4 py-3">
              <NavLink
                to="/"
                className="text-foreground hover:text-primary flex items-center gap-2 transition-colors"
              >
                <ListTodo />
                Daily Tasks
              </NavLink>
              <div className="ml-auto flex items-center gap-3">
                {showMenu && <UserMenu user={user} />}
                <ThemeSwitch />
              </div>
            </header>
            <main className="flex-1 overflow-hidden p-4">{children}</main>
          </div>
          <Toaster />
        </ThemeProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const revalidator = useRevalidator();

  useEffect(() => {
    function handleVisibilityChange() {
      // ページが非表示から表示に変わったときにデータを再取得
      if (document.visibilityState === "visible") {
        revalidator.revalidate();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [revalidator]);

  return (
    <NuqsAdapter>
      <Outlet />
    </NuqsAdapter>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="container mx-auto p-4 pt-16">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full overflow-x-auto p-4">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}

function ThemeSwitch() {
  const { theme, setTheme } = useTheme();

  /* Update theme-color meta tag
   * when theme is updated */
  useEffect(() => {
    const themeColor = theme === "dark" ? "#020817" : "#fff";
    const metaThemeColor = document.querySelector("meta[name='theme-color']");
    if (metaThemeColor) metaThemeColor.setAttribute("content", themeColor);
  }, [theme]);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="scale-95 rounded-full">
          <Sun className="size-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute size-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Light{" "}
          <Check
            size={14}
            className={cn("ml-auto", theme !== "light" && "hidden")}
          />
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Dark
          <Check
            size={14}
            className={cn("ml-auto", theme !== "dark" && "hidden")}
          />
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          System
          <Check
            size={14}
            className={cn("ml-auto", theme !== "system" && "hidden")}
          />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

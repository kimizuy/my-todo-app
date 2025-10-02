import type { Route } from "./+types/root";
import "./app.css";
import { ListTodo } from "lucide-react";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { TopNav } from "./components/layout/top-nav";
import { ThemeProvider } from "./components/theme-provider";
import { ThemeSwitch } from "./components/theme-switch";
import { SkipLink } from "./components/ui/skip-link";

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
            <header className="bg-background flex items-center gap-3 border-b px-4 py-3 sm:gap-4">
              <TopNav
                links={[
                  {
                    title: (
                      <div className="flex items-center gap-1">
                        <ListTodo />
                        Daily Tasks
                      </div>
                    ),
                    href: "/",
                  },
                  { title: "Archives", href: "/archives" },
                  { title: "Sample", href: "/sample" },
                ]}
              />
              <div className="ml-auto flex items-center space-x-4">
                <ThemeSwitch />
              </div>
            </header>
            <main className="flex-1 overflow-hidden p-4">{children}</main>
          </div>
        </ThemeProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
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

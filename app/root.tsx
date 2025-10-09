import type { Route } from "./+types/root";
import "./app.css";
import { ListTodo } from "lucide-react";
import {
  Form,
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from "react-router";
import { getAuthUser } from "~/features/auth/lib/auth-service";
import { ThemeProvider } from "~/features/theme/components/theme-provider";
import { ThemeSwitch } from "~/features/theme/components/theme-switch";
import { TopNav } from "~/shared/components/top-nav";
import { Button } from "~/shared/components/ui/button";
import { SkipLink } from "~/shared/components/ui/skip-link";

export async function loader({ request, context }: Route.LoaderArgs) {
  const user = await getAuthUser(request, context);
  return { user };
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
                ]}
              />
              <div className="ml-auto flex items-center space-x-4">
                {user && (
                  <>
                    <span className="text-muted-foreground text-sm">
                      {user.email}
                    </span>
                    <Form method="post" action="/api/auth/logout">
                      <Button type="submit" variant="outline" size="sm">
                        ログアウト
                      </Button>
                    </Form>
                  </>
                )}
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

import type { Route } from "./+types/_index";
import { TodoApp } from "./components/todo-app";
import { Header } from "~/components/layout/header";
import { Main } from "~/components/layout/main";
import { TopNav } from "~/components/layout/top-nav";
import { ThemeSwitch } from "~/components/theme-switch";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export function loader({ context }: Route.LoaderArgs) {
  return { message: "Hello from Vercel" };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <Header>
        <TopNav
          links={[
            {
              title: "Home",
              href: "/",
            },
            {
              title: "About",
              href: "/about",
            },
            {
              title: "Contact",
              href: "/contact",
            },
          ]}
        />
        <div className="ml-auto flex items-center space-x-4">
          <ThemeSwitch />
        </div>
      </Header>
      <Main>
        <TodoApp />
      </Main>
    </>
  );
}

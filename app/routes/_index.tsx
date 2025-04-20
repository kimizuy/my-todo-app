import type { Route } from "./+types/_index";
import { TodoApp } from "./components/todo-app";
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
    <div>
      <ThemeSwitch />
      <TodoApp />
    </div>
  );
}

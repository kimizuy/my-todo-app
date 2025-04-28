import type { Route } from "./+types/_index";
import { TodoApp } from "./components/todo-app";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Daily Tasks" },
    { name: "description", content: "Manage your daily tasks effectively!" },
  ];
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return <TodoApp />;
}

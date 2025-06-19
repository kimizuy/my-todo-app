import type { Route } from "./+types/route";
import { TodoApp } from "./components/todo-app";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Daily Tasks" },
    { name: "description", content: "Manage your daily tasks effectively!" },
  ];
}

export default function Home() {
  return <TodoApp />;
}

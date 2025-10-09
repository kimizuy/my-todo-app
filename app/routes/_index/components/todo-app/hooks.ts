import { useEffect, useState } from "react";
import { useFetcher, useLoaderData } from "react-router";
import type { Task } from "~/db/schema";
import type { loader } from "../../route";

export function useTasks() {
  const { tasks: serverTasks } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  // サーバーのタスクを初期値として使用
  const [optimisticTasks, setOptimisticTasks] = useState<Task[]>(serverTasks);

  // サーバーのタスクが更新されたら反映
  useEffect(() => {
    setOptimisticTasks(serverTasks);
  }, [serverTasks]);

  // fetcherが実行中で楽観的更新がある場合はそれを使用
  const tasks =
    fetcher.state === "submitting" || fetcher.state === "loading"
      ? optimisticTasks
      : serverTasks;

  return {
    tasks,
    setTasks: setOptimisticTasks,
    fetcher,
  };
}

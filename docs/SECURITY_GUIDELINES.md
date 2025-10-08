# セキュリティガイドライン

## ユーザーデータ分離の原則

このアプリケーションでは、**すべてのデータアクセスでユーザーIDによるフィルタリングを必須**とします。

## ✅ 推奨: UserScopedDbを使用

```typescript
// app/routes/tasks/route.tsx
import { createUserDb } from "~/lib/db.server";
import { requireAuth } from "~/lib/auth.server";

export async function loader({ request, context }: Route.LoaderArgs) {
  const user = await requireAuth(request, context);
  const userDb = createUserDb(context.cloudflare.env.DB, user.id);

  // ✅ 自動的にuserIdでフィルタリングされる
  const tasks = await userDb.getTasks();

  return { tasks };
}

export async function action({ request, context }: Route.ActionArgs) {
  const user = await requireAuth(request, context);
  const userDb = createUserDb(context.cloudflare.env.DB, user.id);

  const formData = await request.formData();
  const intent = formData.get("intent");

  switch (intent) {
    case "create": {
      const content = formData.get("content") as string;
      // ✅ userIdは自動的に追加される
      await userDb.createTask({
        id: `task-${Date.now()}`,
        content,
        columnId: "uncategorized",
        createdAt: new Date().toISOString(),
      });
      break;
    }

    case "update": {
      const taskId = formData.get("taskId") as string;
      const columnId = formData.get("columnId") as string;
      // ✅ 他のユーザーのタスクは更新できない
      await userDb.updateTask(taskId, { columnId });
      break;
    }

    case "delete": {
      const taskId = formData.get("taskId") as string;
      // ✅ 他のユーザーのタスクは削除できない
      await userDb.deleteTask(taskId);
      break;
    }
  }

  return { success: true };
}
```

## ❌ 避けるべき: 生のDrizzleを直接使用

```typescript
// ❌ BAD: userIdフィルタを忘れる可能性がある
export async function action({ request, context }: Route.ActionArgs) {
  const user = await requireAuth(request, context);
  const db = drizzle(context.cloudflare.env.DB);

  const taskId = formData.get("taskId") as string;

  // 🚨 危険: 他のユーザーのタスクも削除できてしまう
  await db.delete(tasks).where(eq(tasks.id, taskId));
}
```

## 新しい操作を追加する際のチェックリスト

新しいaction/loaderを追加する際は、必ず以下を確認してください：

### 1. 認証チェック

- [ ] `requireAuth(request, context)`でユーザーを取得しているか？

### 2. データアクセス方法の選択

#### オプションA: UserScopedDbを使う（推奨）

- [ ] `createUserDb(context.cloudflare.env.DB, user.id)`を使用しているか？
- [ ] UserScopedDbのメソッド（`getTasks`、`createTask`など）を使用しているか？

#### オプションB: 生のDrizzleを使う場合

- [ ] すべてのSELECTクエリに`eq(table.userId, user.id)`が含まれているか？
- [ ] すべてのUPDATEクエリに`and(eq(table.id, id), eq(table.userId, user.id))`が含まれているか？
- [ ] すべてのDELETEクエリに`and(eq(table.id, id), eq(table.userId, user.id))`が含まれているか？

### 3. テーブル設計

- [ ] 新しいテーブルに`userId`カラムがあるか？
- [ ] `userId`に外部キー制約があるか？
- [ ] `userId`にインデックスが張られているか？

### 4. テスト

- [ ] 異なるユーザーのデータが見えないことをテストしたか？
- [ ] 他のユーザーのデータを操作できないことをテストしたか？

## セキュリティレビューのポイント

コードレビュー時は以下を確認してください：

### 🔍 チェック項目

1. **すべてのloader/actionで認証チェックがあるか？**

   ```typescript
   const user = await requireAuth(request, context);
   ```

2. **UserScopedDbを使用しているか？**

   ```typescript
   const userDb = createUserDb(context.cloudflare.env.DB, user.id);
   ```

3. **生のDrizzleを使う場合、userIdフィルタがあるか？**

   ```typescript
   .where(and(eq(table.id, id), eq(table.userId, user.id)))
   ```

4. **クライアント側でlocalStorageを使っていないか？**
   - タスクやユーザーデータはlocalStorageに保存してはいけません
   - 設定やUI状態のみlocalStorageの使用を許可します

## よくある間違い

### ❌ 間違い1: IDのみでフィルタリング

```typescript
// 🚨 他のユーザーのタスクも削除できてしまう
await db.delete(tasks).where(eq(tasks.id, taskId));
```

### ✅ 正しい方法

```typescript
// ✅ 自分のタスクのみ削除
await userDb.deleteTask(taskId);
// または
await db
  .delete(tasks)
  .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)));
```

### ❌ 間違い2: batch操作でuserIdチェックを忘れる

```typescript
// 🚨 他のユーザーのタスクも更新できてしまう
for (const task of tasksData) {
  await db
    .update(tasks)
    .set({ columnId: task.columnId })
    .where(eq(tasks.id, task.id));
}
```

### ✅ 正しい方法

```typescript
// ✅ 自分のタスクのみ更新
for (const task of tasksData) {
  await userDb.updateTask(task.id, { columnId: task.columnId });
}
```

### ❌ 間違い3: localStorageにユーザーデータを保存

```typescript
// 🚨 ブラウザを共有する全ユーザーでデータが共有される
localStorage.setItem("tasks", JSON.stringify(tasks));
```

### ✅ 正しい方法

```typescript
// ✅ サーバーから取得したデータを使用
const { tasks } = useLoaderData<typeof loader>();
```

## 参考資料

- [OWASP - Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
- [OWASP - Insecure Direct Object References](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html)

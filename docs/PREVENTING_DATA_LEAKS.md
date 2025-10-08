# ユーザーデータ分離の欠如を防ぐ方法

## 問題の概要

このアプリケーションで発生した「ユーザーデータ分離の欠如」は、以下の2つの問題が原因でした：

1. **クライアント側**: localStorageにデータを保存していたため、同じブラウザを使う全ユーザーでデータが共有されていた
2. **サーバー側**: データベースクエリでユーザーIDのフィルタリングが抜けていたため、他のユーザーのデータを操作できてしまった

## 対策の4本柱

### 1. 🛡️ 型安全なデータアクセス層

**UserScopedDbクラス**を使用して、すべてのデータアクセスに自動的にユーザーIDフィルタを適用します。

```typescript
// app/lib/db.server.ts
export class UserScopedDb {
  constructor(d1: D1Database, userId: number) {
    this.db = drizzle(d1);
    this.userId = userId;
  }

  // すべてのメソッドが自動的にuserIdでフィルタリング
  async getTasks() { ... }
  async createTask(data) { ... }
  async updateTask(taskId, data) { ... }
  async deleteTask(taskId) { ... }
}
```

**使用例**:

```typescript
export async function loader({ request, context }: Route.LoaderArgs) {
  const user = await requireAuth(request, context);
  const userDb = createUserDb(context.cloudflare.env.DB, user.id);

  // ✅ 自動的にuser.idでフィルタリングされる
  const tasks = await userDb.getTasks();

  return { tasks };
}
```

### 2. 📋 セキュリティチェックリスト

新しい操作を追加する際は、[SECURITY_GUIDELINES.md](../SECURITY_GUIDELINES.md)のチェックリストを使用してください。

**必須チェック項目**:

- [ ] `requireAuth()`でユーザーを取得しているか？
- [ ] `UserScopedDb`を使用しているか？
- [ ] 生のDrizzleを使う場合、`and(eq(table.id, id), eq(table.userId, user.id))`が含まれているか？
- [ ] localStorageにユーザーデータを保存していないか？

### 3. 🔍 自動セキュリティチェック

カスタムセキュリティチェックスクリプト（[scripts/security-check.sh](../scripts/security-check.sh)）で危険なパターンを検出します。

```bash
# セキュリティチェックを実行
npm run security-check
```

**チェック内容**:

- ✅ drizzle-ormの直接インポート（警告）
- ✅ loader/actionでの認証チェック漏れ（エラー）
- ✅ localStorageへのユーザーデータ保存（エラー）
- ✅ userIdフィルタの欠如（警告）
- ✅ API routesでのD1直接使用（警告）

**Git commit時の自動実行**:
lefthook設定により、コミット前に自動的にセキュリティチェックが実行されます。

```yaml
# lefthook.yml
pre-commit:
  jobs:
    - run: npm run check
    - run: npm run security-check # 自動実行
```

### 4. ✅ テストによる検証

[route.test.ts](../app/routes/_index/route.test.ts)のようなテストを作成して、ユーザー分離を検証します。

```typescript
it("ユーザー2は他人のタスクを更新できない", async () => {
  const user2Db = createUserDb(d1, user2Id);
  const updated = await user2Db.updateTask("task-user1", {
    columnId: "done",
  });

  expect(updated).toHaveLength(0); // 更新されない
});
```

## 実装の流れ

### 新しい機能を追加する場合

1. **認証チェック**

   ```typescript
   const user = await requireAuth(request, context);
   ```

2. **UserScopedDbの作成**

   ```typescript
   const userDb = createUserDb(context.cloudflare.env.DB, user.id);
   ```

3. **データアクセス**

   ```typescript
   // ✅ 自動的にuserIdでフィルタリング
   const data = await userDb.getTasks();
   ```

4. **テストの作成**

   ```typescript
   it("他のユーザーのデータは見えない", async () => {
     const user1Db = createUserDb(d1, user1Id);
     const user2Db = createUserDb(d1, user2Id);

     const user1Tasks = await user1Db.getTasks();
     const user2Tasks = await user2Db.getTasks();

     // それぞれのタスクは分離されている
     expect(user1Tasks).not.toContain(user2Tasks[0]);
   });
   ```

### 新しいテーブルを追加する場合

1. **スキーマにuserIdを追加**

   ```typescript
   export const myNewTable = sqliteTable("my_new_table", {
     id: text("id").primaryKey(),
     userId: integer("user_id")
       .notNull()
       .references(() => users.id, { onDelete: "cascade" }),
     // ... 他のカラム
   });
   ```

2. **UserScopedDbにメソッドを追加**

   ```typescript
   class UserScopedDb {
     async getMyData() {
       return this.db
         .select()
         .from(myNewTable)
         .where(eq(myNewTable.userId, this.userId))
         .all();
     }

     async createMyData(data) {
       return this.db
         .insert(myNewTable)
         .values({ ...data, userId: this.userId })
         .returning();
     }
   }
   ```

3. **テストを追加**
   ```typescript
   it("ユーザー間でデータが分離される", async () => {
     // テストコード
   });
   ```

## よくある質問

### Q1: なぜ生のDrizzleを直接使ってはいけないのか？

**A**: 生のDrizzleを使うと、userIdフィルタを忘れる可能性があるためです。UserScopedDbを使うことで、**忘れることができない仕組み**を作ります。

### Q2: localStorageは絶対に使ってはいけないのか？

**A**: **ユーザーデータ**の保存には使ってはいけません。UI設定（テーマ、言語設定など）のような、ユーザー間で共有されても問題ないデータのみ使用可能です。

### Q3: 既存のコードをUserScopedDbに移行すべきか？

**A**: 推奨しますが、必須ではありません。既存のコードは以下のパターンを確実に使用していれば問題ありません：

```typescript
// ✅ これなら安全
await db
  .delete(tasks)
  .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)));
```

ただし、新しいコードはすべてUserScopedDbを使用してください。

## トラブルシューティング

### 問題: "他のユーザーのデータが見える"

**チェック項目**:

1. loaderで`requireAuth`を呼んでいますか？
2. `UserScopedDb`を使っていますか？
3. 生のDrizzleを使っている場合、`eq(table.userId, user.id)`が含まれていますか？
4. クライアント側でlocalStorageから読み込んでいませんか？

### 問題: "データが保存されない"

**チェック項目**:

1. createメソッドで`userId`を渡していますか？（UserScopedDbを使えば自動）
2. 外部キー制約が正しく設定されていますか？
3. actionで`fetcher.submit()`を呼んでいますか？

## 参考資料

- [OWASP - Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
- [OWASP - IDOR Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html)
- [SECURITY_GUIDELINES.md](../SECURITY_GUIDELINES.md)

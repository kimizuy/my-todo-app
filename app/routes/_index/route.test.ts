/**
 * ユーザーデータ分離のテスト
 *
 * このテストは、異なるユーザー間でデータが分離されていることを確認します。
 * 新しい機能を追加する際は、同様のテストを作成してください。
 */

import { env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { hashPassword } from "~/features/auth/lib/password";
import { users } from "~/features/auth/schema";
import { createUserDb } from "~/features/todo/lib/todo-service";
import { tasks } from "~/features/todo/schema";

describe("ユーザーデータ分離", () => {
  let db: ReturnType<typeof drizzle>;
  let user1Id: number;
  let user2Id: number;

  beforeEach(async () => {
    // Cloudflare D1データベースを取得
    db = drizzle(env.DB);

    // テストデータをクリーンアップ
    await db.delete(tasks);
    await db.delete(users);

    // ユーザー1を作成
    const [user1] = await db
      .insert(users)
      .values({
        email: "user1@example.com",
        passwordHash: await hashPassword("password123"),
      })
      .returning();
    user1Id = user1.id;

    // ユーザー2を作成
    const [user2] = await db
      .insert(users)
      .values({
        email: "user2@example.com",
        passwordHash: await hashPassword("password123"),
      })
      .returning();
    user2Id = user2.id;
  });

  describe("タスクの作成", () => {
    it("タスクに正しいuserIdが設定される", async () => {
      const user1Db = createUserDb(env.DB, user1Id);

      await user1Db.createTask({
        id: "task-1",
        content: "User 1's task",
        columnId: "uncategorized",
        createdAt: new Date().toISOString(),
      });

      const [task] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, "task-1"));

      expect(task.userId).toBe(user1Id);
    });
  });

  describe("タスクの取得", () => {
    beforeEach(async () => {
      // ユーザー1のタスクを作成
      await db.insert(tasks).values({
        id: "task-user1",
        userId: user1Id,
        content: "User 1's task",
        columnId: "uncategorized",
        createdAt: new Date().toISOString(),
      });

      // ユーザー2のタスクを作成
      await db.insert(tasks).values({
        id: "task-user2",
        userId: user2Id,
        content: "User 2's task",
        columnId: "uncategorized",
        createdAt: new Date().toISOString(),
      });
    });

    it("ユーザー1は自分のタスクのみ取得できる", async () => {
      const user1Db = createUserDb(env.DB, user1Id);
      const user1Tasks = await user1Db.getTasks();

      expect(user1Tasks).toHaveLength(1);
      expect(user1Tasks[0].id).toBe("task-user1");
      expect(user1Tasks[0].userId).toBe(user1Id);
    });

    it("ユーザー2は自分のタスクのみ取得できる", async () => {
      const user2Db = createUserDb(env.DB, user2Id);
      const user2Tasks = await user2Db.getTasks();

      expect(user2Tasks).toHaveLength(1);
      expect(user2Tasks[0].id).toBe("task-user2");
      expect(user2Tasks[0].userId).toBe(user2Id);
    });
  });

  describe("タスクの更新", () => {
    beforeEach(async () => {
      await db.insert(tasks).values({
        id: "task-user1",
        userId: user1Id,
        content: "User 1's task",
        columnId: "uncategorized",
        createdAt: new Date().toISOString(),
      });
    });

    it("ユーザー1は自分のタスクを更新できる", async () => {
      const user1Db = createUserDb(env.DB, user1Id);

      const updated = await user1Db.updateTask("task-user1", {
        columnId: "done",
      });

      expect(updated).toHaveLength(1);
      expect(updated[0].columnId).toBe("done");
    });

    it("ユーザー2は他人のタスクを更新できない", async () => {
      const user2Db = createUserDb(env.DB, user2Id);

      const updated = await user2Db.updateTask("task-user1", {
        columnId: "done",
      });

      // 更新されたレコードがない
      expect(updated).toHaveLength(0);

      // タスクは変更されていない
      const [task] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, "task-user1"));
      expect(task.columnId).toBe("uncategorized");
    });
  });

  describe("タスクの削除", () => {
    beforeEach(async () => {
      await db.insert(tasks).values({
        id: "task-user1",
        userId: user1Id,
        content: "User 1's task",
        columnId: "uncategorized",
        createdAt: new Date().toISOString(),
      });
    });

    it("ユーザー1は自分のタスクを削除できる", async () => {
      const user1Db = createUserDb(env.DB, user1Id);

      const deleted = await user1Db.deleteTask("task-user1");

      expect(deleted).toHaveLength(1);

      // タスクが削除されている
      const task = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, "task-user1"))
        .get();
      expect(task).toBeUndefined();
    });

    it("ユーザー2は他人のタスクを削除できない", async () => {
      const user2Db = createUserDb(env.DB, user2Id);

      const deleted = await user2Db.deleteTask("task-user1");

      // 削除されたレコードがない
      expect(deleted).toHaveLength(0);

      // タスクは削除されていない
      const task = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, "task-user1"))
        .get();
      expect(task).toBeDefined();
      expect(task?.userId).toBe(user1Id);
    });
  });
});

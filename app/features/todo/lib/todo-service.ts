import { and, desc, eq, isNotNull, isNull, type SQL } from "drizzle-orm";
import { type DrizzleD1Database, drizzle } from "drizzle-orm/d1";
import type { User } from "~/features/auth/schema";
import { type NewTask, type Task, tasks } from "~/features/todo/schema";

/**
 * ユーザースコープ付きデータベースクライアント
 * すべてのクエリに自動的にuserIdフィルタを適用します
 */
export class UserScopedDb {
  private db: DrizzleD1Database;
  private userId: User["id"];

  constructor(d1: D1Database, userId: User["id"]) {
    this.db = drizzle(d1);
    this.userId = userId;
  }

  /**
   * ユーザーのタスクを取得
   */
  async getTasks(additionalWhere?: SQL) {
    const conditions = additionalWhere
      ? and(
          eq(tasks.userId, this.userId),
          isNull(tasks.archivedAt),
          additionalWhere,
        )
      : and(eq(tasks.userId, this.userId), isNull(tasks.archivedAt));

    return this.db
      .select()
      .from(tasks)
      .where(conditions)
      .orderBy(tasks.order)
      .all();
  }

  /**
   * ユーザーのタスクを作成
   */
  async createTask(data: Omit<NewTask, "userId">) {
    // orderが指定されていない場合、最大値+1を設定
    let order = data.order;
    if (order === undefined) {
      const tasks = await this.getTasks();
      const maxOrder = tasks.reduce(
        (max, task) => Math.max(max, task.order),
        -1,
      );
      order = maxOrder + 1;
    }

    return this.db
      .insert(tasks)
      .values({
        ...data,
        order,
        userId: this.userId, // 自動的にuserIdを追加
      })
      .returning();
  }

  /**
   * ユーザーのタスクを更新
   */
  async updateTask(
    taskId: Task["id"],
    data: Partial<Omit<NewTask, "userId" | "id" | "createdAt">>,
  ) {
    return this.db
      .update(tasks)
      .set(data)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, this.userId)))
      .returning();
  }

  /**
   * ユーザーのタスクを削除
   */
  async deleteTask(taskId: Task["id"]) {
    return this.db
      .delete(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, this.userId)))
      .returning();
  }

  /**
   * ユーザーのアーカイブ済みタスクを取得
   */
  async getArchivedTasks() {
    return this.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, this.userId), isNotNull(tasks.archivedAt)))
      .orderBy(desc(tasks.archivedAt))
      .all();
  }

  /**
   * 完了したタスクをアーカイブ
   */
  async archiveDoneTasks() {
    const archivedAt = new Date().toISOString();

    // 完了タスクをアーカイブ（archivedAtを設定）
    const result = await this.db
      .update(tasks)
      .set({ archivedAt })
      .where(and(eq(tasks.columnId, "done"), eq(tasks.userId, this.userId)))
      .returning();

    return { archived: result.length };
  }

  /**
   * 複数のタスクを一括更新
   */
  async batchUpdateTasks(
    tasksData: Array<
      Pick<Task, "id" | "columnId"> & Partial<Pick<Task, "order">>
    >,
  ) {
    for (const task of tasksData) {
      await this.updateTask(task.id, {
        columnId: task.columnId,
        order: task.order,
      });
    }
  }

  /**
   * 生のドリズルインスタンスを取得（必要な場合のみ使用）
   * ⚠️ 注意: このメソッドを使う場合は手動でuserIdフィルタを追加してください
   */
  getRawDb() {
    return this.db;
  }

  /**
   * 現在のユーザーIDを取得
   */
  getUserId() {
    return this.userId;
  }
}

/**
 * ユーザースコープ付きデータベースクライアントを作成
 */
export function createUserDb(d1: D1Database, userId: User["id"]) {
  return new UserScopedDb(d1, userId);
}

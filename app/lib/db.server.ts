import { and, desc, eq, type SQL } from "drizzle-orm";
import { type DrizzleD1Database, drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";

/**
 * ユーザースコープ付きデータベースクライアント
 * すべてのクエリに自動的にuserIdフィルタを適用します
 */
export class UserScopedDb {
  private db: DrizzleD1Database<typeof schema>;
  private userId: number;

  constructor(d1: D1Database, userId: number) {
    this.db = drizzle(d1);
    this.userId = userId;
  }

  /**
   * ユーザーのタスクを取得
   */
  async getTasks(additionalWhere?: SQL) {
    const conditions = additionalWhere
      ? and(eq(schema.tasks.userId, this.userId), additionalWhere)
      : eq(schema.tasks.userId, this.userId);

    return this.db
      .select()
      .from(schema.tasks)
      .where(conditions)
      .orderBy(schema.tasks.order)
      .all();
  }

  /**
   * ユーザーのタスクを作成
   */
  async createTask(data: {
    id: string;
    content: string;
    columnId: "uncategorized" | "do-today" | "do-not-today" | "done";
    createdAt: string;
    order?: number;
  }) {
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
      .insert(schema.tasks)
      .values({
        ...data,
        order,
        userId: this.userId, // 自動的にuserIdを追加
      })
      .returning();
  }

  /**
   * ユーザーのタスクを更新
   * ⚠️ 重要: 他のユーザーのタスクは更新できません
   */
  async updateTask(
    taskId: string,
    data: {
      columnId?: "uncategorized" | "do-today" | "do-not-today" | "done";
      content?: string;
      order?: number;
    },
  ) {
    return this.db
      .update(schema.tasks)
      .set(data)
      .where(
        and(
          eq(schema.tasks.id, taskId),
          eq(schema.tasks.userId, this.userId), // ✅ 常にuserIdでフィルタ
        ),
      )
      .returning();
  }

  /**
   * ユーザーのタスクを削除
   * ⚠️ 重要: 他のユーザーのタスクは削除できません
   */
  async deleteTask(taskId: string) {
    return this.db
      .delete(schema.tasks)
      .where(
        and(
          eq(schema.tasks.id, taskId),
          eq(schema.tasks.userId, this.userId), // ✅ 常にuserIdでフィルタ
        ),
      )
      .returning();
  }

  /**
   * ユーザーのアーカイブ済みタスクを取得
   */
  async getArchivedTasks() {
    return this.db
      .select()
      .from(schema.archivedTasks)
      .where(eq(schema.archivedTasks.userId, this.userId))
      .orderBy(desc(schema.archivedTasks.archivedAt))
      .all();
  }

  /**
   * 完了したタスクをアーカイブ
   * ⚠️ 重要: 自分のタスクのみアーカイブできます
   */
  async archiveDoneTasks() {
    // 完了タスクを取得
    const doneTasks = await this.db
      .select()
      .from(schema.tasks)
      .where(
        and(
          eq(schema.tasks.columnId, "done"),
          eq(schema.tasks.userId, this.userId),
        ),
      )
      .all();

    if (doneTasks.length > 0) {
      const archivedAt = new Date().toISOString();

      // アーカイブテーブルに挿入
      await this.db.insert(schema.archivedTasks).values(
        doneTasks.map((task) => ({
          id: task.id,
          userId: task.userId,
          content: task.content,
          columnId: task.columnId,
          order: task.order,
          createdAt: task.createdAt,
          archivedAt,
        })),
      );

      // 完了タスクを削除
      await this.db
        .delete(schema.tasks)
        .where(
          and(
            eq(schema.tasks.columnId, "done"),
            eq(schema.tasks.userId, this.userId),
          ),
        );
    }

    return { archived: doneTasks.length };
  }

  /**
   * 複数のタスクを一括更新
   * ⚠️ 重要: 自分のタスクのみ更新できます
   */
  async batchUpdateTasks(
    tasksData: Array<{
      id: string;
      columnId: "uncategorized" | "do-today" | "do-not-today" | "done";
      order?: number;
    }>,
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
export function createUserDb(d1: D1Database, userId: number) {
  return new UserScopedDb(d1, userId);
}

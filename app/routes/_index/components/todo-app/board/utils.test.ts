import { describe, expect, it } from "vitest";
import type { Task } from "~/db/schema";
import {
  findTaskById,
  getTasksByColumn,
  isColumnId,
  moveTaskToColumn,
  reorderTasksInColumn,
} from "./utils";

describe("reorderTasksInColumn", () => {
  it("カラム内のタスクを並び替え、order値を更新する", () => {
    const tasks: Task[] = [
      {
        id: "task-1",
        userId: 1,
        content: "Task 1",
        columnId: "do-today",
        order: 0,
        createdAt: "2025-01-01",
      },
      {
        id: "task-2",
        userId: 1,
        content: "Task 2",
        columnId: "do-today",
        order: 1,
        createdAt: "2025-01-01",
      },
      {
        id: "task-3",
        userId: 1,
        content: "Task 3",
        columnId: "do-today",
        order: 2,
        createdAt: "2025-01-01",
      },
    ];

    // task-1 (index 0) を task-3 (index 2) の位置に移動
    const result = reorderTasksInColumn(tasks, 0, 2);

    // 順序が変わっている
    expect(result[0].id).toBe("task-2");
    expect(result[1].id).toBe("task-3");
    expect(result[2].id).toBe("task-1");

    // order値が正しく更新されている
    expect(result[0].order).toBe(0);
    expect(result[1].order).toBe(1);
    expect(result[2].order).toBe(2);
  });

  it("order値が変わらないタスクは同じ参照を返す（パフォーマンス最適化）", () => {
    const tasks: Task[] = [
      {
        id: "task-1",
        userId: 1,
        content: "Task 1",
        columnId: "do-today",
        order: 0,
        createdAt: "2025-01-01",
      },
      {
        id: "task-2",
        userId: 1,
        content: "Task 2",
        columnId: "do-today",
        order: 1,
        createdAt: "2025-01-01",
      },
      {
        id: "task-3",
        userId: 1,
        content: "Task 3",
        columnId: "do-today",
        order: 2,
        createdAt: "2025-01-01",
      },
    ];

    // task-1 (index 0) を task-2 (index 1) の位置に移動
    const result = reorderTasksInColumn(tasks, 0, 1);

    // task-3 は移動していないので、order は 2 のまま
    // 同じ参照を返すべき（パフォーマンス最適化）
    const task3Result = result.find((t: Task) => t.id === "task-3");
    expect(task3Result).toBe(tasks[2]); // 同じ参照
  });
});

describe("moveTaskToColumn", () => {
  it("タスクを別のカラムに移動し、移動先の最大order値+1を設定する", () => {
    const tasks: Task[] = [
      {
        id: "task-1",
        userId: 1,
        content: "Task 1",
        columnId: "uncategorized",
        order: 0,
        createdAt: "2025-01-01",
      },
      {
        id: "task-2",
        userId: 1,
        content: "Task 2",
        columnId: "do-today",
        order: 0,
        createdAt: "2025-01-01",
      },
      {
        id: "task-3",
        userId: 1,
        content: "Task 3",
        columnId: "do-today",
        order: 1,
        createdAt: "2025-01-01",
      },
    ];

    // task-1 を do-today カラムに移動
    const result = moveTaskToColumn(tasks, "task-1", "do-today");

    const movedTask = result.find((t: Task) => t.id === "task-1");

    // カラムIDが変更されている
    expect(movedTask?.columnId).toBe("do-today");

    // order値が移動先カラムの最大値+1になっている
    expect(movedTask?.order).toBe(2);
  });

  it("空のカラムに移動する場合、order値を0にする", () => {
    const tasks: Task[] = [
      {
        id: "task-1",
        userId: 1,
        content: "Task 1",
        columnId: "uncategorized",
        order: 0,
        createdAt: "2025-01-01",
      },
    ];

    // task-1 を空の do-today カラムに移動
    const result = moveTaskToColumn(tasks, "task-1", "do-today");

    const movedTask = result.find((t: Task) => t.id === "task-1");

    expect(movedTask?.columnId).toBe("do-today");
    expect(movedTask?.order).toBe(0);
  });
});

describe("findTaskById", () => {
  it("指定されたIDのタスクを見つける", () => {
    const tasks: Task[] = [
      {
        id: "task-1",
        userId: 1,
        content: "Task 1",
        columnId: "uncategorized",
        order: 0,
        createdAt: "2025-01-01",
      },
      {
        id: "task-2",
        userId: 1,
        content: "Task 2",
        columnId: "do-today",
        order: 0,
        createdAt: "2025-01-01",
      },
    ];

    const result = findTaskById(tasks, "task-2");

    expect(result).toBeDefined();
    expect(result?.id).toBe("task-2");
  });

  it("見つからない場合はundefinedを返す", () => {
    const tasks: Task[] = [];
    const result = findTaskById(tasks, "non-existent");

    expect(result).toBeUndefined();
  });
});

describe("getTasksByColumn", () => {
  it("指定されたカラムのタスクのみを返す", () => {
    const tasks: Task[] = [
      {
        id: "task-1",
        userId: 1,
        content: "Task 1",
        columnId: "uncategorized",
        order: 0,
        createdAt: "2025-01-01",
      },
      {
        id: "task-2",
        userId: 1,
        content: "Task 2",
        columnId: "do-today",
        order: 0,
        createdAt: "2025-01-01",
      },
      {
        id: "task-3",
        userId: 1,
        content: "Task 3",
        columnId: "do-today",
        order: 1,
        createdAt: "2025-01-01",
      },
    ];

    const result = getTasksByColumn(tasks, "do-today");

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("task-2");
    expect(result[1].id).toBe("task-3");
  });
});

describe("isColumnId", () => {
  it("有効なカラムIDの場合trueを返す", () => {
    expect(isColumnId("uncategorized")).toBe(true);
    expect(isColumnId("do-today")).toBe(true);
    expect(isColumnId("do-not-today")).toBe(true);
    expect(isColumnId("done")).toBe(true);
  });

  it("無効な値の場合falseを返す", () => {
    expect(isColumnId("invalid")).toBe(false);
    expect(isColumnId("")).toBe(false);
    expect(isColumnId(123)).toBe(false);
    expect(isColumnId(null)).toBe(false);
    expect(isColumnId(undefined)).toBe(false);
  });
});

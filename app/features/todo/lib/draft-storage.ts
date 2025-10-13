import type { ColumnId } from "../schema";

const DRAFT_KEY_PREFIX = "task-draft-";

/**
 * タスクの下書きをlocalStorageに保存する
 * @param columnId カラムID
 * @param content 保存する内容
 */
export function saveDraft(columnId: ColumnId, content: string): void {
  try {
    const key = `${DRAFT_KEY_PREFIX}${columnId}`;
    localStorage.setItem(key, content);
  } catch (error) {
    // localStorageへのアクセスに失敗した場合（プライベートモードなど）は無視
    console.warn("Failed to save draft to localStorage:", error);
  }
}

/**
 * タスクの下書きをlocalStorageから読み込む
 * @param columnId カラムID
 * @returns 保存された内容、存在しない場合はnull
 */
export function loadDraft(columnId: ColumnId): string | null {
  try {
    const key = `${DRAFT_KEY_PREFIX}${columnId}`;
    const content = localStorage.getItem(key);

    // 空文字列の場合はnullを返す
    if (content === null || content === "") {
      return null;
    }

    return content;
  } catch (error) {
    // localStorageへのアクセスに失敗した場合は無視
    console.warn("Failed to load draft from localStorage:", error);
    return null;
  }
}

/**
 * タスクの下書きをlocalStorageから削除する
 * @param columnId カラムID
 */
export function clearDraft(columnId: ColumnId): void {
  try {
    const key = `${DRAFT_KEY_PREFIX}${columnId}`;
    localStorage.removeItem(key);
  } catch (error) {
    // localStorageへのアクセスに失敗した場合は無視
    console.warn("Failed to clear draft from localStorage:", error);
  }
}

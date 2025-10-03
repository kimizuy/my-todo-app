import DOMPurify from "dompurify";
import { marked } from "marked";
import type { Task } from "./types";

// タスクリストにcreatedAtを追加し、必要に応じてlocalStorageを保存する関数
// 主にcreatedAtがない古いデータを更新するために使用する
export function updateTasksWithCreatedAt(
  originalTasks: Task[],
  storageKey: string,
): Task[] {
  // 古いデータにcreatedAtを追加
  const tasksWithCreatedAt = originalTasks.map((task) => ({
    ...task,
    createdAt: task.createdAt || task.archivedAt || new Date().toISOString(),
  }));

  // createdAtを追加した場合はlocalStorageを更新
  const hasUpdatedTasks = tasksWithCreatedAt.some(
    (task, index) => task.createdAt !== originalTasks[index]?.createdAt,
  );

  if (hasUpdatedTasks) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(tasksWithCreatedAt));
    } catch (error) {
      console.error(`${storageKey}の保存に失敗しました:`, error);
    }
  }

  return tasksWithCreatedAt;
}

const renderer = new marked.Renderer();

// リンクのレンダリングをカスタマイズ
renderer.link = ({ href, title, tokens }) => {
  // tokensからテキストを取得（markdown内のリンクテキスト）
  let text = href;
  if (tokens.length > 0) {
    text = tokens.map((token) => token.raw || "").join("");
  }

  const displayText = text === href ? truncateUrl(href) : text;
  const titleAttr = title ? ` title="${title}"` : ` title="${href}"`;
  return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${displayText}</a>`;
};

// タスクのコンテンツをマークダウンからHTMLにパースする関数
export function parseTaskContent(content: string): string {
  const html = marked.parse(content, {
    breaks: true,
    async: false,
    renderer,
  });

  // Client-side only: sanitize HTML using DOMPurify
  if (typeof window !== "undefined") {
    return DOMPurify.sanitize(html, {
      ADD_ATTR: ["target", "rel"],
    });
  }

  // Server-side: return unsanitized HTML (will be sanitized on client after hydration)
  return html as string;
}

function truncateUrl(url: string, maxLength = 40): string {
  if (url.length <= maxLength) return url;

  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const pathAndQuery = urlObj.pathname + urlObj.search + urlObj.hash;

    const availableLength = maxLength - domain.length - 3; // 3 for "..."

    if (availableLength > 10 && pathAndQuery.length > availableLength) {
      const truncatedPath = pathAndQuery.substring(0, availableLength);
      return `${domain}${truncatedPath}...`;
    }

    if (domain.length > maxLength - 3) {
      return `${domain.substring(0, maxLength - 3)}...`;
    }

    return `${domain}...`;
  } catch {
    // URLパースに失敗した場合は単純に切り詰める
    return `${url.substring(0, maxLength - 3)}...`;
  }
}

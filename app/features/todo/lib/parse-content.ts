import DOMPurify from "dompurify";
import { marked } from "marked";

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
export function parseContent(content: string): string {
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

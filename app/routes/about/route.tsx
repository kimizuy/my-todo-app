const FEATURES = [
  {
    title: "直感的なドラッグ＆ドロップ",
    description:
      "タスクを指でスワイプするだけで、簡単に異なるカテゴリに移動できます",
  },
  {
    title: "レスポンシブデザイン",
    description:
      "スマートフォン画面に最適化されたレイアウトで、外出先でも快適に使用可能",
  },
  {
    title: "最小限の操作でタスク管理",
    description: "シンプルな入力フォームで新規タスクを素早く追加",
  },
  {
    title: "視覚的な状態管理",
    description:
      "4つの明確なカテゴリ（「未分類」「今日やる」「今日やらない」「完了」）で作業の優先順位が一目でわかる",
  },
  {
    title: "ワンタップ操作",
    description:
      "「今日のタスクをリセット」ボタン一つで、翌日の計画をスムーズに立て直せます。今日のタスクをリセットし、再度構築し直すことで今日やることにフォーカスします",
  },
  {
    title: "オフライン対応",
    description:
      "ローカルストレージ機能でデータを自動保存、インターネット接続がなくても使用可能",
  },
];

const TECH_STACK = [
  { category: "フロントエンド", technologies: ["React 19", "TypeScript"] },
  { category: "UI/スタイリング", technologies: ["Tailwind CSS", "Radix UI"] },
  {
    category: "ドラッグ＆ドロップ",
    technologies: ["@dnd-kit/core", "@dnd-kit/sortable"],
  },
  { category: "ルーティング", technologies: ["React Router 7"] },
  { category: "開発環境", technologies: ["Vite", "TypeScript", "Biome"] },
];

export default function About() {
  return (
    <article className="prose dark:prose-invert mx-auto">
      <h1>このTODOアプリについて</h1>

      <p>
        このアプリは「使いやすさを重視した」日々のタスク管理ツールです。スマートフォンでも快適に使用できるよう設計されています。
      </p>

      <section>
        <h2>主な特徴</h2>
        <ul>
          {FEATURES.map((feature) => (
            <li key={feature.title}>
              <strong>{feature.title}</strong>: {feature.description}
            </li>
          ))}
        </ul>
      </section>

      <p>
        モバイルファーストの思想で設計されており、スマートフォンの画面サイズに合わせたグリッドレイアウトを採用。タップやスワイプの操作感を最適化し、外出先でも素早くタスク管理ができます。
      </p>

      <section>
        <h2>技術スタック</h2>
        <div>
          {TECH_STACK.map((item) => (
            <div key={item.category}>
              <h3>{item.category}</h3>
              <ul>
                {item.technologies.map((tech) => (
                  <li key={tech}>{tech}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </article>
  );
}

# Daily Tasks

1日単位のタスク管理にフォーカスしたTODOアプリです。

https://my-todo-app.kimizuy.workers.dev/

## 主な特徴

- **直感的なドラッグ＆ドロップ**: タスクを指でスワイプするだけで、簡単に異なるカテゴリに移動できます
- **レスポンシブデザイン**: スマートフォン画面に最適化されたレイアウトで、外出先でも快適に使用可能
- **最小限の操作でタスク管理**: シンプルな入力フォームで新規タスクを素早く追加
- **視覚的な状態管理**: 4つの明確なカテゴリ（「未分類」「今日やる」「今日やらない」「完了」）で作業の優先順位が一目でわかる
- **ワンタップ操作**: 「今日のタスクをリセット」ボタン一つで、翌日の計画をスムーズに立て直せます。今日のタスクをリセットし、再度構築し直すことで今日やることにフォーカスします
- **ユーザー認証**: セキュアなJWT認証により、ユーザーごとにタスクを管理
- **クラウド同期**: Cloudflare D1データベースで安全にデータを保存

モバイルファーストの思想で設計されており、スマートフォンの画面サイズに合わせたグリッドレイアウトを採用。タップやスワイプの操作感を最適化し、外出先でも素早くタスク管理ができます。

## 技術スタック

### フロントエンド

- React 19
- React Router 7
- TypeScript

### バックエンド

- Cloudflare Workers
- Cloudflare D1 (SQLite)
- Drizzle ORM

### 認証

- JWT (Web Crypto API)
- PBKDF2パスワードハッシュ

### UI/スタイリング

- Tailwind CSS v4
- Radix UI

### ドラッグ＆ドロップ

- @dnd-kit/core
- @dnd-kit/sortable

### 開発環境

- Vite
- TypeScript
- Biome
- Prettier

## 開発環境のセットアップ

### 前提条件

- Node.js 22以上がインストールされていること
- npmがインストールされていること
- Cloudflareアカウント（デプロイ時に必要）

### 環境について

このプロジェクトは**開発環境と本番環境を完全に分離**しています：

- **開発環境**: ローカルD1（`.wrangler`ディレクトリ内のSQLite）を使用
- **本番環境**: Cloudflare D1（リモート）を使用

開発時は本番データベースに一切影響を与えません。

### インストール手順

1. 依存パッケージをインストールする

```bash
npm install
```

2. ローカルD1データベースにマイグレーションを適用する

```bash
npm run db:migrate:local
```

3. JWT秘密鍵を設定する（ローカル開発用）

```bash
echo 'JWT_SECRET=your-super-secret-key-here' > .dev.vars
```

4. 開発サーバーを起動する

```bash
npm run dev
```

### 本番環境へのデプロイ

初回デプロイ時のみ、以下の手順が必要です：

1. 本番用D1データベースを作成する

```bash
# D1データベースを作成（database_idをwrangler.jsoncに設定）
npx wrangler d1 create my-todo-db
```

2. 本番DBにマイグレーションを適用する

```bash
npm run db:migrate:remote
```

3. JWT秘密鍵を設定する（本番環境用）

```bash
echo "your-super-secret-key-here" | npx wrangler secret put JWT_SECRET
```

4. デプロイする

```bash
npm run deploy
```

## 🔒 セキュリティ

このプロジェクトでは、ユーザーデータの安全性を最優先事項としています。

### セキュリティチェックの実行

```bash
npm run security-check
```

### 自動セキュリティチェック

Git commit時に、lefthookにより以下が自動実行されます：

- コード品質チェック
- セキュリティチェック

### 詳細なドキュメント

- [docs/SECURITY_GUIDELINES.md](docs/SECURITY_GUIDELINES.md) - セキュリティガイドライン
- [docs/PREVENTING_DATA_LEAKS.md](docs/PREVENTING_DATA_LEAKS.md) - データ漏洩防止ガイド

## 📝 主要なスクリプト

```bash
# 開発サーバー起動
npm run dev

# ビルド＆デプロイ
npm run deploy

# 型チェック
npm run typecheck

# コード品質チェック
npm run check

# セキュリティチェック
npm run security-check

# データベーススタジオ（GUI）
npm run db:studio
```

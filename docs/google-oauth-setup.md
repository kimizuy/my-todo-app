# Google OAuth設定ガイド

このガイドでは、アプリケーションでGoogle OAuthログインを有効にするための手順を説明します。

## 1. Google Cloud Consoleでプロジェクトを作成

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成するか、既存のプロジェクトを選択
3. プロジェクト名を入力（例: "my-todo-app"）

## 2. OAuth同意画面を設定

1. 左側のメニューから「APIとサービス」→「OAuth同意画面」を選択
2. ユーザータイプで「外部」を選択（テスト段階では問題なし）
3. 「作成」をクリック
4. 必須情報を入力:
   - アプリ名: `Daily Tasks`（またはあなたのアプリ名）
   - ユーザーサポートメール: あなたのメールアドレス
   - デベロッパーの連絡先情報: あなたのメールアドレス
5. 「保存して次へ」をクリック
6. スコープ画面では何も追加せず「保存して次へ」
7. テストユーザーを追加（開発中は自分のGoogleアカウントを追加）
8. 「保存して次へ」をクリック

## 3. OAuth 2.0クライアントIDを作成

1. 左側のメニューから「APIとサービス」→「認証情報」を選択
2. 「認証情報を作成」→「OAuth クライアント ID」をクリック
3. アプリケーションの種類: `ウェブ アプリケーション`を選択
4. 名前を入力（例: "my-todo-app-oauth-client"）
5. 「承認済みのリダイレクト URI」に以下を追加:
   - ローカル開発: `http://localhost:5173/rpc/oauth/google/callback`
   - 本番環境: `https://your-domain.com/rpc/oauth/google/callback`
6. 「作成」をクリック
7. **クライアントIDとクライアントシークレットをコピー**（後で使用）

## 4. ローカル環境に環境変数を設定

`.dev.vars`ファイルを編集して、以下の値を設定:

```bash
JWT_SECRET=my-super-secret-jwt-key-please-change-in-production-12345
RESEND_API_KEY=re_KhekUfGs_A89T18F7xJsPEhyQ7YcZDEA3
GOOGLE_CLIENT_ID=<Google Cloud ConsoleからコピーしたクライアントID>
GOOGLE_CLIENT_SECRET=<Google Cloud Consoleからコピーしたクライアントシークレット>
```

例:

```bash
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-AbCdEfGhIjKlMnOpQrStUvWxYz
```

## 5. 本番環境に環境変数を設定

Cloudflare Workersの本番環境にシークレットを設定:

```bash
# Google Client IDを設定
wrangler secret put GOOGLE_CLIENT_ID
# プロンプトが表示されたら、クライアントIDをペースト

# Google Client Secretを設定
wrangler secret put GOOGLE_CLIENT_SECRET
# プロンプトが表示されたら、クライアントシークレットをペースト
```

または、Cloudflare Dashboardから設定:

1. [Cloudflare Dashboard](https://dash.cloudflare.com/)にログイン
2. Workers & Pages → あなたのWorker → Settings → Variables and Secrets
3. "Add variable"をクリック
4. 変数名: `GOOGLE_CLIENT_ID`、値: クライアントID
5. "Encrypt"にチェックを入れて保存
6. 同様に`GOOGLE_CLIENT_SECRET`も追加

## 6. 本番環境のリダイレクトURIを更新

1. Google Cloud Consoleに戻る
2. 「APIとサービス」→「認証情報」
3. 作成したOAuthクライアントをクリック
4. 「承認済みのリダイレクト URI」に本番環境のURLを追加:
   - `https://your-actual-domain.com/rpc/oauth/google/callback`
5. 「保存」をクリック

## 7. データベースマイグレーションを本番環境に適用

```bash
npm run db:migrate:remote
```

## 8. 動作確認

1. ローカル環境で開発サーバーを起動:

   ```bash
   npm run dev
   ```

2. ブラウザで`http://localhost:5173/auth`にアクセス

3. "Googleでログイン"ボタンをクリック

4. Googleアカウントでログイン

5. ログイン成功後、ホームページにリダイレクトされることを確認

## トラブルシューティング

### エラー: "redirect_uri_mismatch"

- Google Cloud Consoleの「承認済みのリダイレクト URI」を確認
- URLが完全に一致していることを確認（末尾のスラッシュの有無も含む）
- ローカル開発では`http://localhost:5173/rpc/oauth/google/callback`
- 本番環境では実際のドメインを使用

### エラー: "Google OAuth credentials are not configured"

- `.dev.vars`に`GOOGLE_CLIENT_ID`と`GOOGLE_CLIENT_SECRET`が設定されているか確認
- 本番環境では`wrangler secret put`コマンドでシークレットを設定済みか確認

### エラー: "access_denied"

- ユーザーがGoogleログインをキャンセルした場合に発生
- テストユーザーとして自分のアカウントを追加しているか確認（開発中）

## セキュリティのベストプラクティス

1. **クライアントシークレットを公開しない**
   - `.dev.vars`は`.gitignore`に含まれていることを確認
   - GitHubなどに誤ってコミットしない

2. **本番環境では必ずHTTPSを使用**
   - Cloudflare Workersは自動的にHTTPSを提供

3. **リダイレクトURIを厳格に管理**
   - 必要最小限のURIのみを登録
   - ワイルドカードは使用しない

4. **定期的にシークレットをローテーション**
   - 定期的にクライアントシークレットを更新

## 参考リンク

- [Google OAuth 2.0ドキュメント](https://developers.google.com/identity/protocols/oauth2)
- [Arctic Google Providerドキュメント](https://arcticjs.dev/providers/google)
- [Cloudflare Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)

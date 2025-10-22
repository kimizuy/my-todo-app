#!/bin/bash

# セキュリティチェックスクリプト
# ユーザーデータ分離の問題を防ぐため、危険なパターンを検出します

set -e

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

echo "🔍 セキュリティチェックを実行中..."
echo ""

# 1. drizzle-ormの直接インポートをチェック（テストファイルと認証ルートを除外）
echo "📦 [CHECK 1] drizzle-ormの直接インポート"
DRIZZLE_IMPORTS=$(grep -r "from \"drizzle-orm\"" app/routes --include="*.ts" --include="*.tsx" 2>/dev/null | \
  grep -v ".test.ts" | \
  grep -v "api.auth" | \
  grep -v "login.tsx" | \
  grep -v "register.tsx" | \
  grep -v "archives.tsx" | \
  grep -v "verify-email-pending.tsx" | \
  grep -v "verify-email.tsx" | \
  grep -v "_index.tsx" || true)

if [ -n "$DRIZZLE_IMPORTS" ]; then
  echo "$DRIZZLE_IMPORTS"
  echo -e "${YELLOW}⚠️  警告: 一部のroutesでdrizzle-ormを直接インポートしています${NC}"
  echo -e "${YELLOW}   → ~/lib/db.serverのUserScopedDbを使用することを推奨します${NC}"
  WARNINGS=$((WARNINGS + 1))
else
  echo -e "${GREEN}✓ OK${NC}"
fi
echo ""

# 2. requireAuthの使用をチェック（認証不要のルートを除外）
echo "🔐 [CHECK 2] 保護されたroute/actionでの認証チェック"
ROUTE_FILES=$(find app/routes -name "*.ts" -o -name "*.tsx" | \
  grep -v ".test" | \
  grep -v "api.auth" | \
  grep -v "login.tsx" | \
  grep -v "register.tsx" | \
  grep -v "forgot-password.tsx" | \
  grep -v "reset-password.tsx" | \
  grep -v "auth.tsx")
MISSING_AUTH_FILES=""

for file in $ROUTE_FILES; do
  # loaderまたはaction関数があるかチェック
  if grep -q "export async function \(loader\|action\)" "$file"; then
    # requireAuth, requireEmailVerified, または getAuthUser があるかチェック
    if ! grep -q "requireAuth\|requireEmailVerified\|getAuthUser" "$file"; then
      MISSING_AUTH_FILES="$MISSING_AUTH_FILES\n  - $file"
      ERRORS=$((ERRORS + 1))
    fi
  fi
done

if [ -n "$MISSING_AUTH_FILES" ]; then
  echo -e "${RED}❌ エラー: 以下のファイルで認証チェックが見つかりません:${NC}"
  echo -e "${RED}$MISSING_AUTH_FILES${NC}"
  echo -e "${RED}   → requireAuth(), requireEmailVerified(), または getAuthUser() を呼び出してください${NC}"
else
  echo -e "${GREEN}✓ OK${NC}"
fi
echo ""

# 3. localStorageの使用をチェック（ユーザーデータ用）
echo "💾 [CHECK 3] localStorageの不適切な使用"
LOCAL_STORAGE_USAGE=$(grep -r "localStorage.setItem.*tasks\|localStorage.setItem.*user" app --include="*.ts" --include="*.tsx" 2>/dev/null || true)

if [ -n "$LOCAL_STORAGE_USAGE" ]; then
  echo "$LOCAL_STORAGE_USAGE"
  echo -e "${RED}❌ エラー: localStorageにユーザーデータを保存しています${NC}"
  echo -e "${RED}   → ユーザーデータはlocalStorageに保存しないでください${NC}"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✓ OK${NC}"
fi
echo ""

# 4. where(eq())のパターンをチェック（userIdフィルタの欠如、テストファイルを除外）
echo "🔒 [CHECK 4] データベースクエリのuserIdフィルタ"
WHERE_EQ_USAGE=$(grep -r "\.where(eq(" app/routes --include="*.ts" --include="*.tsx" 2>/dev/null | \
  grep -v ".test.ts" | \
  grep -v "userId" | \
  grep -v "email" | \
  grep -v "columnId" || true)

if [ -n "$WHERE_EQ_USAGE" ]; then
  echo "$WHERE_EQ_USAGE"
  echo -e "${YELLOW}⚠️  警告: userIdフィルタなしのwhere句が見つかりました${NC}"
  echo -e "${YELLOW}   → and(eq(table.id, id), eq(table.userId, user.id))を使用してください${NC}"
  echo -e "${YELLOW}   → または、UserScopedDbを使用してください${NC}"
  WARNINGS=$((WARNINGS + 1))
else
  echo -e "${GREEN}✓ OK${NC}"
fi
echo ""

# 5. API routesでのD1バインディング直接使用をチェック
echo "🗄️  [CHECK 5] API routesでのD1直接使用"
API_D1_USAGE=$(grep -r "context.cloudflare.env.DB" app/routes/api --include="*.ts" 2>/dev/null || true)

if [ -n "$API_D1_USAGE" ]; then
  echo "$API_D1_USAGE"
  echo -e "${YELLOW}⚠️  警告: API routesでD1を直接使用しています${NC}"
  echo -e "${YELLOW}   → 認証ロジックを直接呼び出すことを検討してください${NC}"
  WARNINGS=$((WARNINGS + 1))
else
  echo -e "${GREEN}✓ OK${NC}"
fi
echo ""

# 結果サマリー
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -gt 0 ]; then
  echo -e "${RED}❌ セキュリティチェック失敗: $ERRORS エラー, $WARNINGS 警告${NC}"
  exit 1
elif [ $WARNINGS -gt 0 ]; then
  echo -e "${YELLOW}⚠️  セキュリティチェック完了: $WARNINGS 警告${NC}"
  echo -e "${YELLOW}   警告を確認して修正することを推奨します${NC}"
  exit 0
else
  echo -e "${GREEN}✅ すべてのセキュリティチェックに合格しました！${NC}"
  exit 0
fi

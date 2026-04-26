# GitHub Pages デプロイ Design

## 概要

GitHub Actions を使って `master` ブランチへの push 時に自動でビルド・デプロイする。
配信先は `https://sgtao.github.io/react-aio-typing/`。

## 前提

- SPA モード（`ssr: false`）は設定済み
- `public/404.html` は作成済み（リダイレクト先 URL の修正が必要）
- Firebase 環境変数は GitHub Secrets に登録する（未実施）

## ファイル変更一覧

| ファイル | 変化 | 内容 |
|---------|------|------|
| `vite.config.ts` | 変更 | `base: '/react-aio-typing/'` を追加 |
| `public/404.html` | 変更 | リダイレクト先を `/react-aio-typing/` に修正 |
| `.github/workflows/deploy.yml` | 新規 | GitHub Actions ワークフロー |

## 詳細設計

### vite.config.ts

`base` を追加することで、ビルド成果物のアセットパス（JS・CSS・画像）が
`/react-aio-typing/assets/...` になり、GitHub Pages のサブパス配信と一致する。

```typescript
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  base: '/react-aio-typing/',
  plugins: [tailwindcss(), reactRouter()],
});
```

### public/404.html

GitHub Pages でサブページ（`/react-aio-typing/menu` など）に直アクセスされると
404 が返るため、`/react-aio-typing/` にリダイレクトして SPA が URL を復元する。

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>aio-typing</title>
  <script>sessionStorage.redirect = location.href;</script>
  <meta http-equiv="refresh" content="0;URL='/react-aio-typing/'">
</head>
<body></body>
</html>
```

### .github/workflows/deploy.yml

`master` push → ビルド → GitHub Pages デプロイ の2ジョブ構成。
Firebase 環境変数はビルドステップで GitHub Secrets から注入する。

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [master]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}
      - uses: actions/upload-pages-artifact@v3
        with:
          path: build/client

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

`workflow_dispatch` を追加することで、GitHub UI から手動実行も可能。

## GitHub 側の手動設定

実装後に以下を手動で行う。

### 1. GitHub Pages のソース設定

`Settings → Pages → Build and deployment → Source` を **GitHub Actions** に変更。

### 2. GitHub Secrets の登録

`Settings → Secrets and variables → Actions → New repository secret` で以下を登録:

| Secret 名 | 値 |
|-----------|-----|
| `VITE_FIREBASE_API_KEY` | Firebase API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID |
| `VITE_FIREBASE_APP_ID` | Firebase App ID |

### 3. Firebase 承認済みドメインの追加

Firebase Console → Authentication → Settings → 承認済みドメイン に以下を追加:

- `sgtao.github.io`

## スコープ外

- カスタムドメインの設定
- プレビュー環境（PR ごとのデプロイ）
- キャッシュ戦略

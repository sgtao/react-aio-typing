# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`react-aio-typing` is a browser-based English typing game built with **Vite + React Router v7 + TypeScript**.
Players type English sentences drawn from the Japanese English-learning book *ALL IN ONE*, with two game modes and audio playback support.

## Development

```bash
npm run dev       # 開発サーバー起動 (http://localhost:5173)
npm run build     # プロダクションビルド
npm run typecheck # 型チェック
npm test          # vitest でユニットテスト実行
```

## Architecture

### Component & Hook structure

```
app/
├── routes/
│   ├── login.tsx            # ログイン画面ルート
│   ├── menu.tsx             # メニュー画面ルート
│   ├── play.tsx             # タイピング中画面ルート
│   ├── history.tsx          # 学習履歴画面ルート
│   └── dummy.tsx            # Chrome DevTools 用ダミー
├── components/
│   ├── LoginScreen.tsx      # Google サインイン UI
│   ├── MenuScreen.tsx       # カテゴリ選択・設定パネル
│   ├── PlayingScreen.tsx    # タイピング中画面
│   ├── ResultScreen.tsx     # 1文完了後の結果画面
│   ├── HistoryScreen.tsx    # 学習履歴（3タブ + リセットダイアログ）
│   ├── LiveStats.tsx        # WPM・正確性・経過時間のリアルタイム表示
│   └── ProtectedRoute.tsx   # 認証ガード（未認証は / にリダイレクト）
├── context/
│   ├── GameContext.tsx      # ゲーム状態・設定を全ルートに提供
│   └── AuthContext.tsx      # Firebase Auth 状態を全ルートに提供
├── hooks/
│   ├── useGameState.ts      # ゲーム状態マシン（画面遷移・音声制御・履歴保存）
│   └── useSettings.ts       # localStorage 設定管理
└── services/
    ├── csvLoader.ts         # categories.yaml + 分割 CSV の fetch・パース・キャッシュ
    ├── historyStorage.ts    # localStorage CRUD（セッション履歴・苦手文）
    ├── resourceLoader.ts    # 音声ファイルの存在確認（HEAD リクエスト）
    └── typingEngine.ts      # TypingEngine クラス（純粋ロジック・React 非依存）
```

### Typing engine

`typingEngine.ts` は純粋な TypeScript クラス。React に依存しない。

- **strict モード**: 誤キーを無視（先に進めない）
- **free モード**: 誤キーも受け付け、Backspace で修正可能
- **auto-skip**: 非英数字（句読点・スペース）はキー入力なしで自動通過
- **WPM**: `(手動入力文字数 ÷ 5) ÷ 経過分数`（auto-skip 分は除外）
- **正確性**: 手動入力分のうち正解した割合（%）

### Game modes

| モード | ヒントエリア表示 | 説明 |
|--------|----------------|------|
| **タイピング** | 英文をそのまま表示 | 英文を見ながら入力する |
| **英作文 Lv.1** | 英文をそのまま表示 | 日本語訳も参照しながら入力（易） |
| **英作文 Lv.2** | 各単語の先頭文字のみ | 例: `He said.` → `H_ s____.` |
| **英作文 Lv.3** | ヒントなし | 日本語訳だけを手がかりに入力（難） |

### Settings (localStorage)

`useSettings.ts` が `localStorage` でセッション間を通じて設定を保持する。

| キー | 型 | デフォルト | 説明 |
|------|----|-----------|------|
| `category` | `string \| null` | `null` | 選択中のカテゴリ（null = 未選択） |
| `order` | `'random' \| 'sequential'` | `'random'` | 出題順 |
| `mode` | `'typing' \| 'composition'` | `'typing'` | ゲームモード |
| `mistypeMode` | `'strict' \| 'free'` | `'free'` | ミスタイプの扱い |
| `caseInsensitive` | `boolean` | `true` | 大文字・小文字を区別しない |
| `translation` | `'slashed' \| 'natural'` | `'slashed'` | 表示する訳のスタイル |
| `hintLevel` | `1 \| 2 \| 3` | `1` | 英作文モードのヒントレベル |

`sequentialIndex`（順番再生の現在位置）はセッション内のみ保持し、localStorage には保存しない。リロードで先頭に戻る。

### Content data format

起動時に `csvLoader.fetchAll(basePath)` が以下の順で全データをメモリにキャッシュする:

1. `public/assets/categories.yaml` を fetch してセクション一覧を取得
2. `public/assets/sentences/01.csv` 〜 `20.csv` を並列 fetch
3. パース・マージして `Sentence[]` としてキャッシュ

全 418 文・20 カテゴリを含む。カテゴリを追加するには `categories.yaml` に1エントリ追加 + CSV ファイルを配置するだけでよい。

**CSV カラム構成（各 sentences/NN.csv）:**

| カラム | 説明 | 例 |
|--------|------|----|
| `no` | 通し番号 | `1` |
| `index` | 表示用インデックス | `[001]` |
| `category` | カテゴリ名 | `01_時制` |
| `category_index` | カテゴリ番号 | `[01]` |
| `englishText` | タイピング対象の英文 | `He grinned...` |
| `translation_slashed` | スラッシュ訳 | `彼はにっこり笑った／...` |
| `translation_natural` | 自然な和訳 | `彼はにっこり笑って...` |

**csvLoader の公開 API:**

| 関数 | 説明 |
|------|------|
| `fetchAll(basePath)` | 起動時に1回呼ぶ。`basePath` は `assets/` で終わるベース URL |
| `getCategories()` | カテゴリ名一覧を返す |
| `getByCategory(cat)` | 指定カテゴリの文一覧を返す |
| `getAll()` | 全文を返す（履歴画面で使用） |

### Audio file convention

音声ファイルは `public/audio/` に置き、`index` カラムの `[` と `]` を除いた番号 + `.mp3` で命名する。
例: `[001]` → `audio/001.mp3`。ファイルの存在確認は HEAD リクエストで行う（`resourceLoader.ts`）。
音声の再生・一時停止は Enter キーで操作する。

### Authentication

Firebase Google OAuth を使用。`AuthContext.tsx` が認証状態を管理し、`ProtectedRoute.tsx` で未認証ユーザーをログイン画面（`/`）にリダイレクトする。

開発時は `.env` に `VITE_DEV_SKIP_AUTH=true` を設定すると Firebase を使わずにモックユーザーでスキップできる。

### Learning history (localStorage)

1文タイプ完了ごとに `useGameState.ts` の `showResult()` が自動保存する。

| localStorage キー | 型 | 内容 |
|------------------|----|------|
| `aio_sessions` | `SessionRecord[]` | セッション履歴（最大 200 件、新しい順） |
| `aio_weak` | `Record<number, { mistypeCount: number }>` | 苦手文データ（no をキーに累積） |

`/history` 画面で「カテゴリ別進捗」「セッション履歴」「苦手な文」の3タブで確認でき、全履歴リセットも可能。

## Game state machine

- **Menu state**: カテゴリを選択し Enter でゲーム開始。設定パネルでカテゴリ・出題順・モード等を変更できる。カテゴリ未選択状態では START ボタンが無効。メニューから「📋 学習履歴」ボタンで `/history` へ遷移できる。
- **Playing state**: TypingEngine がキー入力を処理する。非英数字は自動スキップ。200ms ごとに WPM・正確性・経過時間をライブ更新する。
  - **strict モード**: 誤キーで入力がブロックされる
  - **free モード**: 誤キーも受け付け、Backspace で修正できる
- **Result state**: 1文完了後に結果画面（WPM・正確性・タイム・正誤ハイライト）を表示する。Enter で次の文へ、Escape でメニューへ戻る。
- `contents_index` が空になると全問終了としてメニューへ戻る。

### Key mapping

**メニュー画面:**

| キー | 動作 |
|------|------|
| Enter / Click | ゲーム開始 |

**タイピング中:**

| キー | 動作 | 備考 |
|------|------|------|
| `0-9a-zA-Z` | タイピング入力 | 句読点・スペースは自動スキップ |
| Backspace | 1文字戻す | free モードのみ |
| Enter | 音声の再生 / 一時停止 | |
| Tab | 訳スタイル切り替え | スラッシュ訳 ↔ 自然な訳 |
| Shift（長押し） | 全文ヒント表示 | 英作文モードのみ。離すと元のヒントに戻る |
| Escape | リセット or メニュー戻り | 0文字入力時: メニューへ即戻り。入力済み1回目: 現在文をリセット + 警告表示。2回目: メニューへ戻る |

**結果画面:**

| キー | 動作 |
|------|------|
| Enter | 次の文へ |
| Escape | メニューへ戻る |

## Testing

vitest + jsdom + @testing-library/react を使用。

```bash
npm test               # watch モード
npx vitest run         # 1回実行
```

テストファイルの場所:

| ファイル | 内容 |
|---------|------|
| `app/services/__tests__/typingEngine.test.ts` | TypingEngine ユニットテスト |
| `app/services/__tests__/historyStorage.test.ts` | historyStorage ユニットテスト |
| `app/components/__tests__/ProtectedRoute.test.tsx` | ProtectedRoute コンポーネントテスト |

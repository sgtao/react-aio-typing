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
```

## Architecture

### Component & Hook structure

```
app/
├── routes/home.tsx              # エントリ（TypingGame をレンダリングするだけ）
├── components/
│   ├── TypingGame.tsx           # オーケストレーター
│   ├── MenuScreen.tsx           # メニュー画面（設定パネル含む）
│   ├── PlayingScreen.tsx        # タイピング中画面
│   ├── ResultScreen.tsx         # 1文完了後の結果画面
│   └── LiveStats.tsx            # WPM・正確性・経過時間のリアルタイム表示
├── hooks/
│   ├── useGameState.ts          # ゲーム状態マシン（画面遷移・音声制御）
│   ├── useTypingEngine.ts       # タイピングエンジン（WPM/正確性・入力判定）
│   └── useSettings.ts           # localStorage 設定管理
└── services/
    ├── resourceLoader.ts        # JSON fetch・型変換
    └── typingEngine.ts          # TypingEngine クラス（純粋ロジック・React 非依存）
```

### Typing engine

`typingEngine.ts` は純粋な TypeScript クラス。React に依存せず、`useTypingEngine.ts` がこれをラップして hook として提供する。

- **strict モード**: 誤キーを無視（先に進めない）
- **free モード**: 誤キーも受け付け、Backspace で修正可能
- **auto-skip**: 非英数字（句読点・スペース）はキー入力なしで自動通過
- **WPM**: `(手動入力文字数 ÷ 5) ÷ 経過分数`（auto-skip 分は除外）
- **正確性**: 手動入力分のうち正解した割合（%）

### Game modes

| モード | ヒントエリア表示 | 説明 |
|--------|----------------|------|
| **タイピング練習** | 英文をそのまま表示 | 英文を見ながら入力する |
| **英作文 Lv.1** | 英文をそのまま表示 | 日本語訳も参照しながら入力（易） |
| **英作文 Lv.2** | 各単語の先頭文字のみ | 例: `He said.` → `H_ s____.` |
| **英作文 Lv.3** | ヒントなし | 日本語訳だけを手がかりに入力（難） |

### Settings (localStorage)

`useSettings.ts` が `localStorage` でセッション間を通じて設定を保持する。

| キー | 型 | デフォルト | 説明 |
|------|----|-----------|------|
| `mode` | `'typing' \| 'composition'` | `'typing'` | ゲームモード |
| `mistypeMode` | `'strict' \| 'free'` | `'free'` | ミスタイプの扱い |
| `caseInsensitive` | `boolean` | `true` | 大文字・小文字を区別しない |
| `translation` | `'slashed' \| 'natural'` | `'slashed'` | 表示する訳のスタイル |
| `hintLevel` | `1 \| 2 \| 3` | `1` | 英作文モードのヒントレベル |

### Content data format

`public/assets-sample.json` から読み込む（パスは `TypingGame.tsx` に定数として定義）。
`translation.natural` は英作文モードおよび Tab キーによる訳切り替え時に使用する。

```json
{
  "category": "01_時制",
  "contents": [
    {
      "index": "idx001",
      "englishText": "The sentence to type.",
      "translation": {
        "slashed": "スラッシュリーディング訳",
        "natural": "自然な和訳"
      }
    }
  ]
}
```

### Audio file convention

音声ファイルは `public/audio/` に置き、`idx` プレフィックスを除いた番号 + `.mp3` で命名する。
例: `idx001` → `audio/001.mp3`。ファイルの存在確認は HEAD リクエストで行う。
音声の再生・一時停止は Enter キーで操作する（旧実装の Space キーから変更）。

## Game state machine

- **Menu state**: Click または Enter でゲーム開始。設定パネルでモード・ヒントレベル等を変更できる。
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
| Escape | 現在の文をリセット・音声を停止 | |

**結果画面:**

| キー | 動作 |
|------|------|
| Enter | 次の文へ |
| Escape | メニューへ戻る |

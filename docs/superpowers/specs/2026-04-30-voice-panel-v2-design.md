# Voice Panel v2 Design

## Goal

現在のインライン型 VoicePanel を、ポップアップモーダル型に刷新する。複数回録音してトランスクリプトを累積できるようにし、判定は target word の単語レベルのハイライト表示（一致=緑、不一致=赤）に変更する。

## Architecture

`useSpeechInput` hook に累積テキスト・タイマー・単語レベル判定ロジックを追加する。`PlayingScreen` の `VoicePanel` コンポーネントを `VoiceModal`（モーダルオーバーレイ）に置き換える。`play.tsx` で `voiceProps` を更新し、`game.css` にモーダル・ハイライト用スタイルを追加する。

## Tech Stack

Web Speech API、React hooks、TypeScript、CSS（既存 `game.css` に追記）

---

## Section 1: アーキテクチャ全体像

### ファイル変更一覧

| ファイル | 種別 | 内容 |
|---|---|---|
| `app/hooks/useSpeechInput.ts` | 変更 | 累積テキスト・タイマー・単語レベル判定を追加 |
| `app/components/PlayingScreen.tsx` | 変更 | `VoicePanel` を `VoiceModal` に置き換え |
| `app/routes/play.tsx` | 変更 | `voiceProps` に新しい props を追加 |
| `app/styles/game.css` | 変更 | モーダルオーバーレイ・単語ハイライトのスタイル追加 |

### UX フロー

```
🎤 音声入力ボタン押下
  → モーダルが開く
  → 録音する（15秒タイマー＋プログレスバー）
  → 今回のトランスクリプト表示
  → 反映ボタン → 累積 textarea に追記
  → 必要なら再度録音（繰り返し可）
  → 判定する → target word の単語ハイライト表示
  → もう一度 / 次へ →
```

---

## Section 2: `useSpeechInput` の変更

### 新インターフェース

```ts
interface WordMatch {
  word: string;
  matched: boolean;
}

interface UseSpeechInputReturn {
  isVoiceMode: boolean;
  isRecording: boolean;
  transcript: string;               // 今回の録音結果（読み取り専用表示用）
  accumulatedText: string;          // 累積テキスト（textarea に双方向バインド）
  recordingProgress: number;        // 0〜100（録音中のカウントダウン）
  partialMatchResult: WordMatch[] | null;
  toggleVoiceMode: () => void;
  startRecording: () => void;
  stopRecording: () => void;
  appendTranscript: () => void;               // transcript → accumulatedText に追記
  setAccumulatedText: (text: string) => void; // textarea 手動編集用
  judgePartial: (targetText: string) => void; // 単語レベル判定
  reset: () => void;                          // accumulatedText・結果をクリア
  isSpeechSupported: boolean;
}
```

### タイマー仕様

- 録音開始時に 15 秒のカウントダウンを `setInterval`（100ms 間隔）で開始
- `recordingProgress` は `100 → 0` に変化（CSS `width` に反映してプログレスバー表示）
- `recordingProgress` が 0 に達したら自動的に `stopRecording()` を呼び出す
- 録音が自然終了（無音検知による `onend` 発火）した場合はタイマーをキャンセルして `recordingProgress` を 0 にリセット

### 削除する関数

- `judge(targetText: string)` → `judgePartial(targetText: string)` に置き換え
- `matchResult: 'match' | 'mismatch' | null` → `partialMatchResult: WordMatch[] | null` に置き換え

### 単語マッチングアルゴリズム

```ts
function judgePartial(targetText: string) {
  const targetWords = targetText.split(/\s+/);
  const accumulatedNormSet = new Set(
    accumulatedText.toLowerCase().split(/\s+/).map(w => w.replace(/[^a-z0-9]/g, ''))
  );
  const result = targetWords.map(word => ({
    word,
    matched: accumulatedNormSet.has(word.toLowerCase().replace(/[^a-z0-9]/g, ''))
  }));
  setPartialMatchResult(result);
}
```

例：target = `"There's a small crack"`, accumulated = `"there is a crack"`
→ `There's` ❌  `a` ✅  `small` ❌  `crack` ✅

### `appendTranscript` の動作

```ts
function appendTranscript() {
  if (!transcript) return;
  setAccumulatedText(prev => prev ? prev + ' ' + transcript : transcript);
  setTranscript('');
}
```

### `reset` の動作

```ts
function reset() {
  setTranscript('');
  setAccumulatedText('');
  setPartialMatchResult(null);
  setRecordingProgress(0);
  // isVoiceMode は変更しない
}
```

---

## Section 3: VoiceModal UI レイアウト

### モーダル構造

```
┌─────────────────────────────────────┐
│  🎤 音声入力                   [✕] │
├─────────────────────────────────────┤
│  ── 録音 ──                         │
│  [● 録音する]  /  [■ 停止]          │
│  [████████████░░░░░░░] 10.2s        │  ← 録音中のみ表示
│                                      │
│  今回：「there is a crack」          │  ← transcript（録音後に表示）
│                         [+ 反映]     │  ← transcript があるとき有効
├─────────────────────────────────────┤
│  ── 判定用テキスト ──               │
│  ┌──────────────────────────────┐   │
│  │ there is a crack             │   │  ← 編集可能 textarea
│  └──────────────────────────────┘   │
│                    [判定する]        │  ← accumulatedText が空でない時有効
├─────────────────────────────────────┤
│  There's ❌  a ✅  small ❌  crack ✅│  ← 判定後に表示
│                                      │
│  [もう一度]          [次へ →]        │
└─────────────────────────────────────┘
```

### 操作仕様

| 操作 | 結果 |
|---|---|
| `[✕]` クリック / オーバーレイクリック | モーダルを閉じる（録音中なら停止してから閉じる） |
| `[録音する]` クリック | 録音開始、タイマー起動 |
| `[停止]` クリック | 録音停止（`onend` で `isRecording` → false） |
| `[+ 反映]` クリック | transcript を accumulatedText に追記、transcript をクリア |
| textarea 編集 | `setAccumulatedText` で即時反映 |
| `[判定する]` クリック | `judgePartial(targetText)` 実行、ハイライト表示 |
| `[もう一度]` クリック | `reset()`（accumulatedText・結果クリア、モーダルは開いたまま） |
| `[次へ →]` クリック | `goToNextContent()` + モーダルを閉じる + `reset()` |

### 単語ハイライト表示

- `matched === true` → `color: #27ae60`（緑）
- `matched === false` → `color: #e74c3c`（赤）
- 各単語を `<span>` で inline 表示し、スペース区切り

### プログレスバー表示仕様

- 録音中のみ表示（`isRecording === true` のとき）
- `width: ${recordingProgress}%` で残り時間を視覚化
- 残り秒数テキストも右端に表示（例：`10.2s`）

### モーダルの `VoiceProps` 変更

```ts
interface VoiceProps {
  isVoiceMode: boolean;
  isRecording: boolean;
  transcript: string;
  accumulatedText: string;
  recordingProgress: number;
  partialMatchResult: WordMatch[] | null;
  onToggleVoiceMode: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onAppendTranscript: () => void;
  onSetAccumulatedText: (text: string) => void;
  onJudgePartial: () => void;
  onReset: () => void;
  onNext: () => void;
  isSpeechSupported: boolean;
}
```

---

## テスト

型チェック: `npm run typecheck`
ユニットテスト: `npx vitest run`

ブラウザ確認:
- composition モードで 🎤 音声入力ボタンが表示される
- ボタン押下でモーダルが開く
- 録音中はプログレスバーが 100→0 に変化する
- 15 秒で自動停止する
- トランスクリプトが表示される
- 反映ボタンで累積テキストに追記される
- textarea を手動編集できる
- 複数回録音して cumulate できる
- 判定する → 単語ごとに緑／赤でハイライト表示される
- もう一度でリセットされる
- 次へ → でモーダルが閉じて次の文に進む
- ✕ / オーバーレイクリックでモーダルが閉じる
- タイピングモードでは音声入力ボタンが非表示

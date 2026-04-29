# Play Screen UX Enhancements Design

## 概要

`play.tsx` および関連コンポーネントに3つの UI/UX 機能を追加する。

1. **セクション・位置ヘッダー** — playing/result フェーズ問わず、カテゴリ名・インデックス・位置（N/M）を常時表示
2. **左/右キーナビゲーション** — playing 中に左右矢印キーで文を前後移動
3. **音声再生/停止ボタン** — Enter キーと並列で動作するトグルボタン（▶/⏸ 切替）

---

## 変更ファイル一覧

| ファイル | 変化 | 内容 |
|---------|------|------|
| `app/hooks/useGameState.ts` | 変更 | GameDisplay 拡張・left/right ハンドラ・audioリスナー・toggleAudio 公開 |
| `app/context/GameContext.tsx` | 変更 | toggleAudio をコンテキストに追加 |
| `app/routes/play.tsx` | 変更 | SectionHeader を phase 問わずレンダリング |
| `app/components/SectionHeader.tsx` | 新規 | セクション・位置ヘッダーコンポーネント |
| `app/components/PlayingScreen.tsx` | 変更 | category-index div 削除・音声ボタン追加・toggleAudio prop 追加 |
| `app/styles/game.css` | 変更 | SectionHeader・flash アニメーション・audio-btn スタイル |

---

## 詳細設計

### 1. GameDisplay の拡張

`app/hooks/useGameState.ts` の `GameDisplay` インターフェースに以下を追加する:

```typescript
sectionPosition: number;  // カテゴリ内の現在位置（1始まり。startGame前は0）
sectionTotal: number;     // カテゴリ内の総文数（startGame前は0）
isAudioPlaying: boolean;  // 現在のオーディオ再生状態
leftFlash: boolean;       // 左境界フラッシュトリガー（500ms で自動リセット）
```

初期値はすべて `0` / `false`。

### 2. MutableState の拡張

```typescript
currentContentIdx: number;  // s.contents 配列内の現在インデックス（init: -1）
leftFlashTimer: ReturnType<typeof setTimeout> | null;
```

### 3. SectionHeader コンポーネント

`app/components/SectionHeader.tsx` を新規作成:

```tsx
interface Props {
  category: string;
  currentIndex: string;
  sectionPosition: number;
  sectionTotal: number;
  leftFlash: boolean;
}

export function SectionHeader({ category, currentIndex, sectionPosition, sectionTotal, leftFlash }: Props) {
  return (
    <div className={`section-header${leftFlash ? ' section-header--flash' : ''}`}>
      <span className="section-category">{category}</span>
      <span className="section-index">{currentIndex}</span>
      <span className="section-position">{sectionPosition} / {sectionTotal}</span>
    </div>
  );
}
```

### 4. play.tsx の変更

`SectionHeader` を phase 条件外でレンダリングする:

```tsx
return (
  <ProtectedRoute>
    <SectionHeader
      category={display.category}
      currentIndex={display.currentIndex}
      sectionPosition={display.sectionPosition}
      sectionTotal={display.sectionTotal}
      leftFlash={display.leftFlash}
    />
    {content}
  </ProtectedRoute>
);
```

### 5. 左/右キーナビゲーション

#### キー動作（playing フェーズのみ）

| 状況 | 左キー | 右キー |
|------|--------|--------|
| 入力中（manual typed > 0） | 現在文をリセット | `currentIdx + 1` へジャンプ |
| リセット済み（typed = 0）かつ idx > 0 | `currentIdx - 1` へジャンプ | — |
| リセット済みかつ idx = 0（左端） | 赤フラッシュ（移動なし） | `currentIdx + 1` へジャンプ |
| 右端（idx = total - 1） | 上記に準じる | 赤フラッシュ（移動なし） |

#### `navigateToIdx(idx)` ヘルパー

左右ナビ共通のロード処理:

```typescript
function navigateToIdx(idx: number) {
  const content = s.contents[idx];
  const cfg = settingsRef.current;
  const hintText = computeHintText(content);
  const pendingMask = cfg.mode === 'composition' ? buildPendingMask(content.word, cfg.hintLevel) : null;
  const translateText = computeTranslateText(content, s.translationMode);
  const engine = new TypingEngine(content.word, cfg.mistypeMode, cfg.caseInsensitive);
  const st = engine.getDisplayState();

  stopAudio(s.currentIndex);
  s.currentContentIdx = idx;
  s.currentIndex = content.index;
  s.currentContent = content;
  s.engine = engine;
  s.phase = 'playing';

  attachAudioListeners(content.index);
  startStatsTimer();
  playAudioAuto(content.index);

  setDisplay((prev) => ({
    ...prev,
    phase: 'playing',
    currentIndex: content.index,
    targetText: content.word,
    hintText,
    translateText,
    pendingMask,
    typed: st.typed,
    enginePosition: st.position,
    wpm: 0,
    accuracy: 100,
    elapsed: 0,
    results: null,
    sectionPosition: idx + 1,
    isAudioPlaying: false,
    shiftHintActive: false,
  }));
}
```

- contentsIndex キューは消費しない（通常進行のキューと独立）
- `prevContent()`: `navigateToIdx(s.currentContentIdx - 1)` を呼ぶ（境界チェック後）
- `forwardContent()`: `navigateToIdx(s.currentContentIdx + 1)` を呼ぶ（境界チェック後）

#### nextContent() の変更点

通常進行（文完了→次へ）でも `currentContentIdx` と `sectionPosition` を更新する:

```typescript
// nextContent() 内の splice 直後に追加
s.currentContentIdx = idx;  // splice で取り出した contentsIndex 値が s.contents[idx] を指す
// setDisplay の追加フィールド:
sectionPosition: s.currentContentIdx + 1,
```

また `nextContent()` 内でも `attachAudioListeners(content.index)` を呼ぶ。

#### leftFlash / rightFlash

```typescript
function triggerFlash() {
  if (s.leftFlashTimer !== null) clearTimeout(s.leftFlashTimer);
  setDisplay((prev) => ({ ...prev, leftFlash: true }));
  s.leftFlashTimer = setTimeout(() => {
    s.leftFlashTimer = null;
    setDisplay((prev) => ({ ...prev, leftFlash: false }));
  }, 500);
}
```

左端・右端の両方に `triggerFlash()` を使用する（フィールド名は `leftFlash` のまま、左右境界共用）。

#### handleKeyDown への追加（playing フェーズ）

```typescript
if (e.key === 'ArrowLeft') {
  e.preventDefault();
  const typedManual = s.engine
    ? s.engine.getDisplayState().typed.filter((c) => !c.auto).length
    : 0;
  if (typedManual > 0) {
    resetCurrentContent();
  } else if (s.currentContentIdx > 0) {
    prevContent();
  } else {
    triggerFlash();
  }
  return;
}
if (e.key === 'ArrowRight') {
  e.preventDefault();
  if (s.currentContentIdx < s.contents.length - 1) {
    forwardContent();
  } else {
    triggerFlash();
  }
  return;
}
```

### 6. 音声再生/停止ボタン

#### `attachAudioListeners(indexName)` ヘルパー

`audioListenerCleanupRef` で旧リスナーをクリーンアップ:

```typescript
const audioListenerCleanupRef = useRef<(() => void) | null>(null);

function attachAudioListeners(indexName: string) {
  if (audioListenerCleanupRef.current) {
    audioListenerCleanupRef.current();
    audioListenerCleanupRef.current = null;
  }
  const el = audio.get(indexName);
  if (!el) {
    setDisplay((prev) => ({ ...prev, isAudioPlaying: false }));
    return;
  }
  const onPlay  = () => setDisplay((prev) => ({ ...prev, isAudioPlaying: true }));
  const onPause = () => setDisplay((prev) => ({ ...prev, isAudioPlaying: false }));
  const onEnded = () => setDisplay((prev) => ({ ...prev, isAudioPlaying: false }));
  el.addEventListener('play',  onPlay);
  el.addEventListener('pause', onPause);
  el.addEventListener('ended', onEnded);
  audioListenerCleanupRef.current = () => {
    el.removeEventListener('play',  onPlay);
    el.removeEventListener('pause', onPause);
    el.removeEventListener('ended', onEnded);
  };
  setDisplay((prev) => ({ ...prev, isAudioPlaying: !el.paused && !el.ended }));
}
```

`attachAudioListeners` は `nextContent()` / `navigateToIdx()` のコンテンツ切替時に呼ぶ。`resetCurrentContent()` では不要（`stopAudio` が `pause` イベントを発火し、既存リスナーが `isAudioPlaying: false` に自動更新するため）。

#### toggleAudio の公開

`useGameState.ts`:
```typescript
const toggleAudioRef = useRef<() => void>(() => {});
// useEffect 内で:
toggleAudioRef.current = toggleAudio;
// 返り値:
const toggleAudioCb = useCallback(() => toggleAudioRef.current(), []);
return { display, startGame, cleanup, toggleAudio: toggleAudioCb };
```

`GameContext.tsx`:
```typescript
interface GameContextValue {
  display: GameDisplay;
  startGame: () => void;
  cleanup: () => void;
  toggleAudio: () => void;  // 追加
}
```

#### ボタン UI（PlayingScreen）

```tsx
<button className="audio-btn" onClick={toggleAudio}>
  {isAudioPlaying
    ? <><span className="audio-icon">⏸</span> Stop ( Enter )</>
    : <><span className="audio-icon">▶</span> Start ( Enter )</>}
</button>
```

`PlayingScreen` の props に `toggleAudio: () => void` と `isAudioPlaying: boolean` を追加。

### 7. PlayingScreen の変更

- 既存の `.category-index` div を削除（SectionHeader に移行）
- 音声ボタンを追加

### 8. CSS

```css
/* SectionHeader */
.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  transition: background-color 0.1s;
}
.section-header--flash {
  animation: flash-red 0.5s ease;
}
@keyframes flash-red {
  0%, 100% { background-color: transparent; }
  30%       { background-color: #fee2e2; }
}
.section-position {
  margin-left: auto;
  font-size: 0.85rem;
  color: #6b7280;
}

/* AudioButton */
.audio-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1.2rem;
  background-color: #38bdf8;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
}
.audio-btn:hover {
  background-color: #0ea5e9;
}
.audio-icon {
  font-size: 1.1rem;
}
```

---

## 動作まとめ

| 操作 | 結果 |
|------|------|
| playing/result いずれも | SectionHeader にカテゴリ・インデックス・N/M を表示 |
| 左キー（入力中） | 現在文リセット |
| 左キー（リセット済み・idx>0） | 前の文へ移動 |
| 左キー（idx=0） | 赤フラッシュ |
| 右キー（idx<total-1） | 次の文へ移動 |
| 右キー（idx=total-1） | 赤フラッシュ |
| 音声ボタン / Enter | 音声再生・停止トグル |
| ボタン表示 | 再生中は「⏸ Stop ( Enter )」、停止中は「▶ Start ( Enter )」 |

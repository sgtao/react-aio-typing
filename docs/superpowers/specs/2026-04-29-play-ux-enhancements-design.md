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
| `app/hooks/useGameState.ts` | 変更 | GameDisplay 拡張・playOrder 方式・left/right ハンドラ・audioリスナー・toggleAudio 公開 |
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
sectionPosition: number;  // playOrder 内の現在位置（1始まり。startGame前は0）
sectionTotal: number;     // カテゴリ内の総文数（startGame前は0）
isAudioPlaying: boolean;  // 現在のオーディオ再生状態
leftFlash: boolean;       // 境界フラッシュトリガー（左右共用、500ms で自動リセット）
```

初期値はすべて `0` / `false`。

### 2. MutableState の変更

`contentsIndex: number[]` を削除し、以下に置き換える:

```typescript
// 削除:
// contentsIndex: number[];

// 追加:
playOrder: number[];        // s.contents へのインデックス列。startGame時に1度だけ生成
currentContentIdx: number;  // playOrder 内の現在位置（-1 = 未開始）
leftFlashTimer: ReturnType<typeof setTimeout> | null;
```

**`playOrder` の生成（`startGame()` 内）:**

```typescript
s.contents = sentences.map(sentenceToContent);
s.playOrder = s.contents.map((_, i) => i);  // [0, 1, 2, ..., N-1]

if (cfg.order === 'random') {
  // Fisher-Yates shuffle
  for (let i = s.playOrder.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [s.playOrder[i], s.playOrder[j]] = [s.playOrder[j], s.playOrder[i]];
  }
}
s.currentContentIdx = -1;
```

sequential では `[0, 1, 2, ...]`、random では Fisher-Yates でシャッフルした配列になる。

### 3. `loadContent(pos)` ヘルパー

nextContent / prevContent / forwardContent の共通ロード処理:

```typescript
function loadContent(pos: number) {
  const contentIdx = s.playOrder[pos];
  const content = s.contents[contentIdx];
  const cfg = settingsRef.current;
  const hintText = computeHintText(content);
  const pendingMask = cfg.mode === 'composition' ? buildPendingMask(content.word, cfg.hintLevel) : null;
  const translateText = computeTranslateText(content, s.translationMode);
  const engine = new TypingEngine(content.word, cfg.mistypeMode, cfg.caseInsensitive);
  const st = engine.getDisplayState();

  stopAudio(s.currentIndex);
  s.currentContentIdx = pos;
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
    sectionPosition: pos + 1,
    isAudioPlaying: false,
    shiftHintActive: false,
  }));
}
```

既存の `nextContent()` はこの `loadContent` を使うよう書き換える:

```typescript
function nextContent() {
  const nextPos = s.currentContentIdx + 1;
  if (nextPos >= s.playOrder.length) {
    gotoMenu();
    return;
  }
  loadContent(nextPos);
}
```

`startGame()` 内の最初のロードも `loadContent(0)` を呼ぶ（`nextContent()` の代わり）。

### 4. SectionHeader コンポーネント

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

### 5. play.tsx の変更

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

### 6. 左/右キーナビゲーション

#### キー動作（playing フェーズのみ）

| 状況 | 左キー | 右キー |
|------|--------|--------|
| 入力中（manual typed > 0） | 現在文をリセット | `loadContent(currentContentIdx + 1)` |
| リセット済み（typed = 0）かつ idx > 0 | `loadContent(currentContentIdx - 1)` | `loadContent(currentContentIdx + 1)` |
| リセット済みかつ idx = 0（左端） | 赤フラッシュ（移動なし） | `loadContent(currentContentIdx + 1)` |
| 右端（idx = playOrder.length - 1） | 上記に準じる | 赤フラッシュ（移動なし） |

#### `triggerFlash()` ヘルパー

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
    loadContent(s.currentContentIdx - 1);
  } else {
    triggerFlash();
  }
  return;
}
if (e.key === 'ArrowRight') {
  e.preventDefault();
  if (s.currentContentIdx < s.playOrder.length - 1) {
    loadContent(s.currentContentIdx + 1);
  } else {
    triggerFlash();
  }
  return;
}
```

### 7. 音声再生/停止ボタン

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

`attachAudioListeners` は `loadContent()` 内で呼ぶ。`resetCurrentContent()` では不要（`stopAudio` が `pause` イベントを発火し、既存リスナーが `isAudioPlaying: false` に自動更新するため）。

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

### 8. PlayingScreen の変更

- 既存の `.category-index` div を削除（SectionHeader に移行）
- 音声ボタンを追加

### 9. CSS

```css
/* SectionHeader */
.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
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

## データフロー図

```
startGame()
  └─ Fisher-Yates shuffle → playOrder = [5, 12, 3, ...]
  └─ currentContentIdx = -1
  └─ loadContent(0)  ←── 最初の文

Enter / 文完了 → nextContent()
  └─ currentContentIdx++ → loadContent(currentContentIdx)
  └─ currentContentIdx >= playOrder.length → gotoMenu()

右キー（playing）
  └─ currentContentIdx < playOrder.length - 1 → loadContent(currentContentIdx + 1)
  └─ else → triggerFlash()

左キー（playing）
  └─ typed > 0 → resetCurrentContent()
  └─ typed = 0 && idx > 0 → loadContent(currentContentIdx - 1)
  └─ typed = 0 && idx = 0 → triggerFlash()

loadContent(pos)
  └─ contentIdx = playOrder[pos]
  └─ content = contents[contentIdx]
  └─ sectionPosition = pos + 1
  └─ sectionTotal = playOrder.length
```

---

## 動作まとめ

| 操作 | 結果 |
|------|------|
| playing/result いずれも | SectionHeader にカテゴリ・インデックス・N/M を表示 |
| N/M の意味 | playOrder 内の位置（sequential: CSV順、random: シャッフル順） |
| 左キー（入力中） | 現在文リセット |
| 左キー（リセット済み・idx>0） | playOrder 上の前の文へ移動 |
| 左キー（idx=0） | 赤フラッシュ |
| 右キー（idx<total-1） | playOrder 上の次の文へ移動 |
| 右キー（idx=total-1） | 赤フラッシュ |
| 音声ボタン / Enter | 音声再生・停止トグル |
| ボタン表示 | 再生中は「⏸ Stop ( Enter )」、停止中は「▶ Start ( Enter )」 |

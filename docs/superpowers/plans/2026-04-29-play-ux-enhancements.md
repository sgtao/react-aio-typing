# Play Screen UX Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** playing/result 両フェーズでセクション位置ヘッダーを常時表示し、左右キーでの文ナビゲーションと音声再生/停止ボタンを追加する。

**Architecture:** `contentsIndex` の逐次スプライス方式を廃止し、`startGame` 時に `playOrder[]` を一括生成（sequential/random 共通）。`currentContentIdx` でその位置を管理し、`loadContent(pos)` が共通ローダーとして nextContent・左右ナビに使われる。`SectionHeader` は `play.tsx` に直接置き、phase 問わず表示される。

**Tech Stack:** React 19, TypeScript, Vite, vitest + @testing-library/react

---

## ファイル変更一覧

| ファイル | 変化 | 内容 |
|---------|------|------|
| `app/hooks/useGameState.ts` | 変更 | GameDisplay・MutableState 拡張・playOrder・loadContent・左右キー・audioリスナー・toggleAudio |
| `app/context/GameContext.tsx` | 変更 | toggleAudio をコンテキストに追加 |
| `app/routes/play.tsx` | 変更 | SectionHeader を phase 問わずレンダリング |
| `app/components/SectionHeader.tsx` | 新規 | セクション・位置ヘッダー |
| `app/components/__tests__/SectionHeader.test.tsx` | 新規 | SectionHeader ユニットテスト |
| `app/components/PlayingScreen.tsx` | 変更 | category-index div 削除・音声ボタン追加 |
| `app/styles/game.css` | 変更 | section-header・flash・audio-btn スタイル |

---

### Task 1: GameDisplay + MutableState 型拡張

**Files:**
- Modify: `app/hooks/useGameState.ts`

- [x] **Step 1: `GameDisplay` インターフェースに4フィールドを追加する**

`app/hooks/useGameState.ts` の `GameDisplay` インターフェース末尾（`shiftHintActive` の後）に追加:

```typescript
export interface GameDisplay {
  phase: GamePhase;
  categories: string[];
  category: string;
  currentIndex: string;
  targetText: string;
  hintText: string;
  translateText: string;
  translationMode: 'slashed' | 'natural';
  pendingMask: string[] | null;
  typed: TypedChar[];
  enginePosition: number;
  wpm: number;
  accuracy: number;
  elapsed: number;
  results: TypingResults | null;
  escWarning: boolean;
  mode: 'typing' | 'composition';
  shiftHintActive: boolean;
  sectionPosition: number;
  sectionTotal: number;
  isAudioPlaying: boolean;
  leftFlash: boolean;
}
```

- [x] **Step 2: `MutableState` を `contentsIndex` → `playOrder` + `currentContentIdx` + `leftFlashTimer` に変更する**

```typescript
interface MutableState {
  phase: GamePhase;
  contents: ContentItem[];
  playOrder: number[];
  currentContentIdx: number;
  currentIndex: string;
  currentContent: ContentItem | null;
  translationMode: 'slashed' | 'natural';
  engine: TypingEngine | null;
  timerHandle: ReturnType<typeof setInterval> | null;
  escWarning: boolean;
  escWarningTimer: ReturnType<typeof setTimeout> | null;
  leftFlashTimer: ReturnType<typeof setTimeout> | null;
}
```

- [x] **Step 3: `useState` の初期値に4フィールドを追加する**

```typescript
const [display, setDisplay] = useState<GameDisplay>({
  phase: 'menu',
  categories: [],
  category: '',
  currentIndex: '',
  targetText: '',
  hintText: '',
  translateText: '',
  translationMode: 'slashed',
  pendingMask: null,
  typed: [],
  enginePosition: 0,
  wpm: 0,
  accuracy: 100,
  elapsed: 0,
  results: null,
  escWarning: false,
  mode: 'typing',
  shiftHintActive: false,
  sectionPosition: 0,
  sectionTotal: 0,
  isAudioPlaying: false,
  leftFlash: false,
});
```

- [x] **Step 4: `stateRef` の初期値を更新する**

```typescript
const stateRef = useRef<MutableState>({
  phase: 'menu',
  contents: [],
  playOrder: [],
  currentContentIdx: -1,
  currentIndex: '',
  currentContent: null,
  translationMode: 'slashed',
  engine: null,
  timerHandle: null,
  escWarning: false,
  escWarningTimer: null,
  leftFlashTimer: null,
});
```

- [x] **Step 5: 新しい `useRef` を2つ追加する**

`startGameFnRef` の宣言の後に追加:

```typescript
const audioListenerCleanupRef = useRef<(() => void) | null>(null);
const toggleAudioRef = useRef<() => void>(() => {});
```

- [x] **Step 6: 型チェックを実行する**

```bash
npm run typecheck
```

期待出力: exit code 0

- [ ] **Step 7: コミットする（ユーザーに確認すること）**

```bash
git add app/hooks/useGameState.ts
git commit -m "feat: extend GameDisplay and MutableState types for play UX enhancements"
```

---

### Task 2: playOrder 生成 + loadContent + nextContent リファクタ

**Files:**
- Modify: `app/hooks/useGameState.ts`

このタスクは `useEffect` 内の関数を書き換える。既存の `nextContent` を削除し `loadContent` + 新しい `nextContent` に置き換え、`startGame` を更新する。

- [x] **Step 1: `useEffect` 内に `loadContent(pos)` 関数を追加する**

`startStatsTimer` の定義の後、既存の `nextContent` の前に以下を追加する:

```typescript
function loadContent(pos: number) {
  const contentIdx = s.playOrder[pos];
  const content = s.contents[contentIdx];
  const cfg = settingsRef.current;
  const translationMode = cfg.translation;
  const hintText = computeHintText(content);
  const pendingMask =
    cfg.mode === 'composition' ? buildPendingMask(content.word, cfg.hintLevel) : null;
  const translateText = computeTranslateText(content, translationMode);
  const engine = new TypingEngine(content.word, cfg.mistypeMode, cfg.caseInsensitive);
  const st = engine.getDisplayState();

  stopAudio(s.currentIndex);
  s.currentContentIdx = pos;
  s.currentIndex = content.index;
  s.currentContent = content;
  s.translationMode = translationMode;
  s.engine = engine;
  s.phase = 'playing';

  startStatsTimer();
  playAudioAuto(content.index);

  setDisplay((prev) => ({
    ...prev,
    phase: 'playing',
    currentIndex: content.index,
    targetText: content.word,
    hintText,
    translateText,
    translationMode,
    pendingMask,
    typed: st.typed,
    enginePosition: st.position,
    wpm: 0,
    accuracy: 100,
    elapsed: 0,
    results: null,
    mode: cfg.mode,
    sectionPosition: pos + 1,
    sectionTotal: s.playOrder.length,
    isAudioPlaying: false,
    leftFlash: false,
    shiftHintActive: false,
  }));
}
```

- [x] **Step 2: 既存の `nextContent` 関数を全面置き換えする**

既存の `nextContent` 関数（`if (s.contentsIndex.length === 0)` から始まる）を削除し、以下に置き換える:

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

- [x] **Step 3: `startGame` 関数を更新する**

`startGame` を以下に置き換える:

```typescript
async function startGame() {
  const cfg = settingsRef.current;
  if (!cfg.category) return;

  const sentences = csvLoader.getByCategory(cfg.category);
  if (sentences.length === 0) return;
  s.contents = sentences.map(sentenceToContent);

  s.playOrder = s.contents.map((_, i) => i);
  if (cfg.order === 'random') {
    for (let i = s.playOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [s.playOrder[i], s.playOrder[j]] = [s.playOrder[j], s.playOrder[i]];
    }
  }
  s.currentContentIdx = -1;

  audio.forEach((el) => el.pause());
  audio.clear();
  for (const content of s.contents) {
    const audioName = `${content.index.replace(/[\[\]]/g, '')}.mp3`;
    const audioPath = `audio/${audioName}`;
    const exists = await checkFileExist(audioPath);
    if (exists) audio.set(content.index, new Audio(audioPath));
  }

  setDisplay((prev) => ({ ...prev, category: cfg.category! }));
  loadContent(0);
  navigateRef.current('/play');
}
```

- [x] **Step 4: 型チェックを実行する**

```bash
npm run typecheck
```

期待出力: exit code 0

- [x] **Step 5: 開発サーバーで動作確認する**

```bash
npm run dev
```

ブラウザで `http://localhost:5173` を開き:
- カテゴリ選択 → START でゲームが開始される
- Enter（文完了後）で次の文に進む
- random/sequential 両モードで正常に動作する
- `sectionPosition` が 1 から始まることをコンソールで確認（DevTools → React DevTools）

- [x] **Step 6: コミットする（ユーザーに確認すること）**

```bash
git add app/hooks/useGameState.ts
git commit -m "feat: replace contentsIndex with playOrder and add loadContent helper"
```

---

### Task 3: 左/右キーナビゲーション + triggerFlash

**Files:**
- Modify: `app/hooks/useGameState.ts`

- [x] **Step 1: `triggerFlash` 関数を追加する**

`handleKeyDown` 関数の定義の直前に追加:

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

- [x] **Step 2: `handleKeyDown` の playing フェーズに ArrowLeft/ArrowRight を追加する**

playing フェーズの `if (e.key === 'Escape')` ブロックの直前に追加:

```typescript
if (e.key === 'ArrowLeft') {
  e.preventDefault();
  const st = s.engine ? s.engine.getDisplayState() : null;
  const typedManual = st ? st.typed.filter((c) => !c.auto).length : 0;
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

- [x] **Step 3: `useEffect` の cleanup に `leftFlashTimer` クリアを追加する**

`useEffect` の return 内（`escWarningTimer` の clearTimeout の後）に追加:

```typescript
if (s.leftFlashTimer !== null) {
  clearTimeout(s.leftFlashTimer);
  s.leftFlashTimer = null;
}
```

- [x] **Step 4: 型チェックを実行する**

```bash
npm run typecheck
```

期待出力: exit code 0

- [x] **Step 5: 開発サーバーで左/右キーを確認する**

```bash
npm run dev
```

- playing 中に左キー: 入力済み文字がある → リセット
- playing 中に左キー: リセット済み → 前の文に移動（最初の文では `leftFlash: true` → DevTools で確認）
- playing 中に右キー: 次の文に移動（最後の文では `leftFlash: true`）

- [x] **Step 6: コミットする（ユーザーに確認すること）**

```bash
git add app/hooks/useGameState.ts
git commit -m "feat: add left/right arrow key navigation with boundary flash"
```

---

### Task 4: 音声リスナー + toggleAudio + GameContext

**Files:**
- Modify: `app/hooks/useGameState.ts`
- Modify: `app/context/GameContext.tsx`

- [x] **Step 1: `attachAudioListeners` 関数を `useEffect` 内に追加する**

`loadContent` 関数の直前に追加:

```typescript
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

- [x] **Step 2: `loadContent` 内で `attachAudioListeners` を呼ぶ**

`loadContent` 内の `stopAudio(s.currentIndex);` の直後に追加:

```typescript
stopAudio(s.currentIndex);
attachAudioListeners(content.index);  // ← 追加
s.currentContentIdx = pos;
```

- [x] **Step 3: `toggleAudioRef` を `toggleAudio` 関数に向ける**

`useEffect` 内の `startGameFnRef.current = startGame;` の直後に追加:

```typescript
toggleAudioRef.current = toggleAudio;
```

- [x] **Step 4: `cleanupFnRef` に音声リスナーのクリーンアップを追加する**

```typescript
cleanupFnRef.current = () => {
  stopAllAudio();
  stopStatsTimer();
  if (audioListenerCleanupRef.current) {
    audioListenerCleanupRef.current();
    audioListenerCleanupRef.current = null;
  }
};
```

- [x] **Step 5: `useGameState` の返り値に `toggleAudio` を追加する**

`useEffect` の外（ファイル末尾付近）の `return` を変更:

```typescript
const toggleAudio = useCallback(() => toggleAudioRef.current(), []);
return { display, startGame, cleanup, toggleAudio };
```

- [x] **Step 6: `GameContext.tsx` を更新する**

`app/context/GameContext.tsx` を以下に置き換える:

```typescript
import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useSettings } from '../hooks/useSettings';
import { useGameState } from '../hooks/useGameState';
import type { GameDisplay } from '../hooks/useGameState';
import type { Settings } from '../hooks/useSettings';

const CSV_PATH = `${import.meta.env.BASE_URL}assets/`;

interface GameContextValue {
  display: GameDisplay;
  settings: Settings;
  updateSettings: (partial: Partial<Settings>) => void;
  startGame: () => void;
  cleanup: () => void;
  toggleAudio: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { settings, updateSettings } = useSettings();
  const { display, startGame, cleanup, toggleAudio } = useGameState(CSV_PATH, settings, navigate);

  useEffect(() => {
    if (display.categories.length > 0 && settings.category === null) {
      updateSettings({ category: display.categories[0] });
    }
  }, [display.categories, settings.category, updateSettings]);

  return (
    <GameContext.Provider value={{ display, settings, updateSettings, startGame, cleanup, toggleAudio }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGameContext(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGameContext must be used within GameProvider');
  return ctx;
}
```

- [x] **Step 7: 型チェックを実行する**

```bash
npm run typecheck
```

期待出力: exit code 0

- [x] **Step 8: コミットする（ユーザーに確認すること）**

```bash
git add app/hooks/useGameState.ts app/context/GameContext.tsx
git commit -m "feat: track audio play state and expose toggleAudio via GameContext"
```

---

### Task 5: SectionHeader コンポーネント + テスト + play.tsx 更新

**Files:**
- Create: `app/components/SectionHeader.tsx`
- Create: `app/components/__tests__/SectionHeader.test.tsx`
- Modify: `app/routes/play.tsx`
- Modify: `app/styles/game.css`

- [x] **Step 1: テストを書く**

`app/components/__tests__/SectionHeader.test.tsx` を作成:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SectionHeader } from '../SectionHeader';

describe('SectionHeader', () => {
  it('カテゴリ・インデックス・位置を表示する', () => {
    render(
      <SectionHeader
        category="01_時制"
        currentIndex="[003]"
        sectionPosition={3}
        sectionTotal={21}
        leftFlash={false}
      />
    );
    expect(screen.getByText('01_時制')).toBeInTheDocument();
    expect(screen.getByText('[003]')).toBeInTheDocument();
    expect(screen.getByText('3 / 21')).toBeInTheDocument();
  });

  it('leftFlash=true のとき section-header--flash クラスを付与する', () => {
    const { container } = render(
      <SectionHeader
        category="01_時制"
        currentIndex="[003]"
        sectionPosition={3}
        sectionTotal={21}
        leftFlash={true}
      />
    );
    expect(container.firstChild).toHaveClass('section-header--flash');
  });

  it('leftFlash=false のとき section-header--flash クラスを付与しない', () => {
    const { container } = render(
      <SectionHeader
        category="01_時制"
        currentIndex="[003]"
        sectionPosition={3}
        sectionTotal={21}
        leftFlash={false}
      />
    );
    expect(container.firstChild).not.toHaveClass('section-header--flash');
  });
});
```

- [x] **Step 2: テストが失敗することを確認する**

```bash
npx vitest run app/components/__tests__/SectionHeader.test.tsx
```

期待出力: FAIL（`SectionHeader` が存在しないため）

- [x] **Step 3: `SectionHeader` コンポーネントを実装する**

`app/components/SectionHeader.tsx` を作成:

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

- [x] **Step 4: テストが通ることを確認する**

```bash
npx vitest run app/components/__tests__/SectionHeader.test.tsx
```

期待出力:
```
Test Files  1 passed (1)
Tests       3 passed (3)
```

- [x] **Step 5: `play.tsx` を更新する**

`app/routes/play.tsx` を以下に置き換える:

```tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useGameContext } from '../context/GameContext';
import { PlayingScreen } from '../components/PlayingScreen';
import { ResultScreen } from '../components/ResultScreen';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { SectionHeader } from '../components/SectionHeader';

export default function Play() {
  const { display, cleanup, toggleAudio } = useGameContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (display.category === '') {
      navigate('/menu', { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const content = (() => {
    if (display.phase === 'playing') return <PlayingScreen display={display} toggleAudio={toggleAudio} />;
    if (display.phase === 'result') return <ResultScreen display={display} />;
    return null;
  })();

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
}
```

- [x] **Step 6: `game.css` に SectionHeader スタイルを追加する**

`app/styles/game.css` の `/* ---- category / index ---- */` セクション（22〜41行）を以下に置き換える:

```css
/* ---- section header ---- */

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  margin-bottom: 0.5rem;
}

.section-header--flash {
  animation: flash-red 0.5s ease;
}

@keyframes flash-red {
  0%, 100% { background-color: transparent; }
  30%       { background-color: #fee2e2; }
}

.section-category {
  border-radius: 0.5em;
  padding: 0.5em;
  background-color: #faf6c2;
}

.section-index {
  border-radius: 0.5em;
  padding: 0.5em;
  background-color: #c2fad7;
}

.section-position {
  margin-left: auto;
  font-size: 0.85rem;
  color: #6b7280;
}
```

- [x] **Step 7: 全テストを実行する**

```bash
npx vitest run
```

期待出力:
```
Test Files  4 passed (4)
Tests       57 passed (57)
```

（既存3ファイル54テスト + SectionHeader新規3テスト = 57）

- [x] **Step 8: 型チェックを実行する**

```bash
npm run typecheck
```

期待出力: exit code 0

- [ ] **Step 9: コミットする（ユーザーに確認すること）**

```bash
git add app/components/SectionHeader.tsx app/components/__tests__/SectionHeader.test.tsx app/routes/play.tsx app/styles/game.css
git commit -m "feat: add SectionHeader component shown in both playing and result phases"
```

---

### Task 6: PlayingScreen 音声ボタン追加 + category-index 削除

**Files:**
- Modify: `app/components/PlayingScreen.tsx`

- [x] **Step 1: `PlayingScreen.tsx` を全面更新する**

`app/components/PlayingScreen.tsx` を以下に置き換える:

```tsx
import { LiveStats } from './LiveStats';
import type { GameDisplay } from '../hooks/useGameState';

interface Props {
  display: GameDisplay;
  toggleAudio: () => void;
}

function TypingDisplay({ display }: { display: GameDisplay }) {
  const { typed, enginePosition, targetText, pendingMask } = display;

  return (
    <p className="target-word">
      {targetText.split('').map((ch, i) => {
        if (i < typed.length) {
          const t = typed[i];
          if (t.auto) return <span key={i} className="char-auto">{ch}</span>;
          return (
            <span key={i} className={t.correct ? 'char-correct' : 'char-wrong'}>
              {ch}
            </span>
          );
        }
        const displayChar = pendingMask ? pendingMask[i] : ch;
        if (i === enginePosition) {
          return <span key={i} className="char-cursor">{displayChar}</span>;
        }
        return <span key={i} className="char-pending">{displayChar}</span>;
      })}
    </p>
  );
}

export function PlayingScreen({ display, toggleAudio }: Props) {
  const {
    hintText, targetText, translateText, translationMode,
    escWarning, mode, shiftHintActive, wpm, accuracy, elapsed, isAudioPlaying,
  } = display;

  const displayedHint = shiftHintActive ? targetText : hintText;

  return (
    <>
      <p className="instruction">
        {mode === 'composition'
          ? 'Enter=音声再生・停止／Tab=訳切替／Esc=リセット(未入力でメニュー)／Shift=全文表示／←→=前後移動'
          : 'Enter=音声再生・停止／Tab=訳切替／Esc=リセット(未入力でメニュー)／←→=前後移動'}
      </p>

      <p className="hint-text">
        <span className="translate-label">
          {translationMode === 'slashed' ? 'スラッシュ訳' : '自然な訳'}：
        </span>
        {translateText}
      </p>

      {displayedHint && <p className="translate-text">{displayedHint}</p>}

      {escWarning && (
        <p className="esc-warning">もう一度 ESC を押すとメニューに戻ります</p>
      )}

      <TypingDisplay display={display} />

      <LiveStats wpm={wpm} accuracy={accuracy} elapsed={elapsed} />

      <button className="audio-btn" onClick={toggleAudio}>
        <span className="audio-icon">{isAudioPlaying ? '⏸' : '▶'}</span>
        {isAudioPlaying ? 'Stop ( Enter )' : 'Start ( Enter )'}
      </button>
    </>
  );
}
```

- [x] **Step 2: `game.css` に `.audio-btn` スタイルを追加する**

`app/styles/game.css` の末尾に追加:

```css
/* ---- audio button ---- */

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
  margin-top: 1rem;
}

.audio-btn:hover {
  background-color: #0ea5e9;
}

.audio-icon {
  font-size: 1.1rem;
}
```

- [x] **Step 3: 型チェックを実行する**

```bash
npm run typecheck
```

期待出力: exit code 0

- [x] **Step 4: 全テストを実行する**

```bash
npx vitest run
```

期待出力: 全テスト PASS

- [x] **Step 5: 開発サーバーでブラウザ確認する**

```bash
npm run dev
```

以下を確認する:
- playing 画面でカテゴリ名・`[インデックス]`・`N / M` が表示される
- result 画面でも同じヘッダーが表示される
- 左右矢印キーで文を前後移動できる
- 左端/右端で画面が赤くフラッシュする
- 音声ボタンが「▶ Start ( Enter )」と表示される
- 音声がある文でボタンをクリックすると再生され「⏸ Stop ( Enter )」に切り替わる
- Enter キーでも同様に音声の再生/停止ができる

- [x] **Step 6: コミットする（ユーザーに確認すること）**

```bash
git add app/components/PlayingScreen.tsx app/styles/game.css
git commit -m "feat: add audio toggle button and remove redundant category-index div"
```

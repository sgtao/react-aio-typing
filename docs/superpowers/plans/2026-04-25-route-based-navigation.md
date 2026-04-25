# Route-Based Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ゲームフェーズ（menu/playing/result）を React Router の2ルート（`/` と `/play`）に移行し、GameContext でルート間の状態を共有する。

**Architecture:** `GameProvider` が `useNavigate` / `useSettings` / `useGameState` を統合してゲーム状態を管理する。`/` は MenuScreen を描画し、`/play` は PlayingScreen または ResultScreen を描画する。`root.tsx` の `App()` に `GameProvider` と共通レイアウト（header/footer）を配置する。

**Tech Stack:** React Router v7, React Context API, TypeScript

---

## ファイル構成

| ファイル | 変化 | 責務 |
|---------|------|------|
| `app/context/GameContext.tsx` | **新規** | GameProvider・useGameContext を定義。navigate/settings/gameState を統合 |
| `app/routes/play.tsx` | **新規** | `/play` ルート。phase に応じて PlayingScreen/ResultScreen を描画 |
| `app/hooks/useGameState.ts` | **変更** | `navigate` 引数を追加、`cleanup` を返す |
| `app/root.tsx` | **変更** | `App()` に GameProvider・header・footer を追加、game.css を移動 |
| `app/routes.ts` | **変更** | `/play` ルートを追加 |
| `app/routes/home.tsx` | **変更** | GameContext から値を取得して MenuScreen を描画 |
| `app/components/TypingGame.tsx` | **削除** | 役割が Context とルートに分散するため不要 |

---

### Task 1: `useGameState` に `navigate` 引数と `cleanup` を追加

**Files:**
- Modify: `app/hooks/useGameState.ts`

- [ ] **Step 1: 関数シグネチャを変更し、`navigateRef` と `cleanupFnRef` を追加**

`app/hooks/useGameState.ts` の58行目のシグネチャを変更する:

```typescript
// 変更前
export function useGameState(csvPath: string, settings: Settings) {

// 変更後
export function useGameState(
  csvPath: string,
  settings: Settings,
  navigate: (to: string) => void,
) {
```

`stateRef` の宣言（77行目付近）の直後に以下2行を追加する:

```typescript
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const cleanupFnRef = useRef<() => void>(() => {});
```

- [ ] **Step 2: `gotoMenu` に `navigate('/')` を追加**

`gotoMenu` 関数（180行目付近）を変更する:

```typescript
function gotoMenu() {
  stopAllAudio();
  stopStatsTimer();
  s.phase = 'menu';
  s.engine = null;
  setDisplay((prev) => ({ ...prev, phase: 'menu', results: null }));
  navigateRef.current('/');
}
```

- [ ] **Step 3: `startGame` を変更（setTimeout 削除・nextContent を先に呼ぶ・navigate 追加）**

`startGame` 関数（277行目付近）を以下に置き換える:

```typescript
async function startGame() {
  const cfg = settingsRef.current;
  if (!cfg.category) return;

  const sentences = csvLoader.getByCategory(cfg.category);
  s.contents = sentences.map(sentenceToContent);
  s.contentsIndex = s.contents.map((_, i) => i);

  audio.forEach((el) => el.pause());
  audio.clear();
  for (const content of s.contents) {
    const audioName = `${content.index.replace(/[\[\]]/g, '')}.mp3`;
    const audioPath = `audio/${audioName}`;
    const exists = await checkFileExist(audioPath);
    if (exists) audio.set(content.index, new Audio(audioPath));
  }

  setDisplay((prev) => ({ ...prev, category: cfg.category! }));
  nextContent();
  navigateRef.current('/play');
}
```

- [ ] **Step 4: `cleanupFnRef` を effect 内で設定し、`cleanup` を返す**

`startGameFnRef.current = startGame;`（300行目付近）の直後に追加:

```typescript
cleanupFnRef.current = () => {
  stopAllAudio();
  stopStatsTimer();
};
```

ファイル末尾の `return` 文を変更する:

```typescript
const cleanup = useCallback(() => cleanupFnRef.current(), []);
return { display, startGame, cleanup };
```

- [ ] **Step 5: 型チェック実行**

```bash
cd /home/shogo/work/idea/2026_ideas/260315_trial-claude-code/52_react-aio-typing && npm run typecheck 2>&1 | head -30
```

Expected: `useGameState` の呼び出し元（TypingGame.tsx）でエラーが出るが、他はエラーなし

---

### Task 2: `GameContext.tsx` を作成

**Files:**
- Create: `app/context/GameContext.tsx`

- [ ] **Step 1: ファイルを新規作成**

```typescript
import { createContext, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useSettings } from '../hooks/useSettings';
import { useGameState } from '../hooks/useGameState';
import type { GameDisplay } from '../hooks/useGameState';
import type { Settings } from '../hooks/useSettings';

const CSV_PATH = '/allinone-text-contents.csv';

interface GameContextValue {
  display: GameDisplay;
  settings: Settings;
  updateSettings: (partial: Partial<Settings>) => void;
  startGame: () => void;
  cleanup: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { settings, updateSettings } = useSettings();
  const { display, startGame, cleanup } = useGameState(CSV_PATH, settings, navigate);

  useEffect(() => {
    if (display.categories.length > 0 && settings.category === null) {
      updateSettings({ category: display.categories[0] });
    }
  }, [display.categories, settings.category, updateSettings]);

  return (
    <GameContext.Provider value={{ display, settings, updateSettings, startGame, cleanup }}>
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

- [ ] **Step 2: 型チェック実行**

```bash
npm run typecheck 2>&1 | head -30
```

Expected: TypingGame.tsx のエラーのみ残る

---

### Task 3: `root.tsx` を更新

**Files:**
- Modify: `app/root.tsx`

- [ ] **Step 1: root.tsx を以下の内容に置き換える**

```typescript
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import "./styles/game.css";
import { GameProvider } from "./context/GameContext";

export const links: Route.LinksFunction = () => [];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <GameProvider>
      <div className="game-container">
        <header>
          <h1>aio-typing</h1>
          <p>
            書籍『
            <a
              href="https://linkage-club.net/books#all"
              target="_blank"
              rel="noopener noreferrer"
            >
              ALL IN ONE
            </a>
            』のタイピングソフトを簡単にしてみる。
          </p>
        </header>
        <Outlet />
        <footer>
          <p>
            <a
              href="https://github.com/sgtao/aio-typing/"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </p>
        </footer>
      </div>
    </GameProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
```

- [ ] **Step 2: 型チェック実行**

```bash
npm run typecheck 2>&1 | head -30
```

---

### Task 4: `routes.ts` に `/play` を追加

**Files:**
- Modify: `app/routes.ts`

- [ ] **Step 1: `/play` ルートを追加**

```typescript
import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("play", "routes/play.tsx"),
  route(".well-known/appspecific/com.chrome.devtools.json", "routes/dummy.tsx"),
] satisfies RouteConfig;
```

---

### Task 5: `play.tsx` を作成

**Files:**
- Create: `app/routes/play.tsx`

- [ ] **Step 1: ファイルを新規作成**

```typescript
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useGameContext } from '../context/GameContext';
import { PlayingScreen } from '../components/PlayingScreen';
import { ResultScreen } from '../components/ResultScreen';

export default function Play() {
  const { display, cleanup } = useGameContext();
  const navigate = useNavigate();

  useEffect(() => {
    // display.category が空の場合はゲーム未開始のため / にリダイレクト
    if (display.category === '') {
      navigate('/', { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  if (display.phase === 'playing') return <PlayingScreen display={display} />;
  if (display.phase === 'result') return <ResultScreen display={display} />;
  return null;
}
```

- [ ] **Step 2: 型チェック実行**

```bash
npm run typecheck 2>&1 | head -30
```

---

### Task 6: `home.tsx` を更新

**Files:**
- Modify: `app/routes/home.tsx`

- [ ] **Step 1: home.tsx を以下の内容に置き換える**

```typescript
import type { Route } from "./+types/home";
import { useGameContext } from '../context/GameContext';
import { MenuScreen } from '../components/MenuScreen';

export function meta({}: Route.MetaArgs) {
  return [
    { title: "aio-typing" },
    { name: "description", content: "ALL IN ONE タイピングゲーム" },
  ];
}

export default function Home() {
  const { display, settings, updateSettings, startGame } = useGameContext();
  return (
    <MenuScreen
      categories={display.categories}
      settings={settings}
      onUpdateSettings={updateSettings}
      onStart={startGame}
    />
  );
}
```

- [ ] **Step 2: 型チェック実行**

```bash
npm run typecheck 2>&1 | head -30
```

Expected: TypingGame.tsx のエラーのみ残る

---

### Task 7: `TypingGame.tsx` を削除・最終確認・コミット

**Files:**
- Delete: `app/components/TypingGame.tsx`

- [ ] **Step 1: TypingGame.tsx を削除**

```bash
rm /home/shogo/work/idea/2026_ideas/260315_trial-claude-code/52_react-aio-typing/app/components/TypingGame.tsx
```

- [ ] **Step 2: 最終型チェック**

```bash
npm run typecheck 2>&1
```

Expected: エラーなし

- [ ] **Step 3: dev サーバーで動作確認**

```bash
npm run dev
```

以下を確認する:
- `http://localhost:5173/` でメニュー画面が表示される
- START ボタン（または Enter キー）で URL が `/play` に変わりタイピング画面が表示される
- タイピング完了後に結果画面が表示される（URL は `/play` のまま）
- 結果画面で Enter → 次の問題、Escape → メニュー（URL が `/` に戻る）
- `http://localhost:5173/play` に直接アクセスすると `/` にリダイレクトされる
- ブラウザの戻るボタンで `/play` → `/` に戻れる

- [ ] **Step 4: コミット**

```bash
git add app/context/GameContext.tsx app/routes/play.tsx app/routes/home.tsx app/root.tsx app/routes.ts app/hooks/useGameState.ts
git rm app/components/TypingGame.tsx
git commit -m "feat: migrate game phases to React Router routes with GameContext"
```

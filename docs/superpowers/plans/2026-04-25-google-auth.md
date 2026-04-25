# Google認証 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Firebase Google Sign-In を追加し、`/` をログイン画面に、`/menu` にMenuScreenを移動し、未認証ユーザーをガードする。

**Architecture:** `AuthContext` が Firebase の認証状態を管理し、`ProtectedRoute` が未認証ユーザーを `/` にリダイレクトする。`AuthProvider` が `GameProvider` の外側で `root.tsx` に配置される。`ssr: false` で SPA モードに切り替え、GitHub Pages 対応の 404.html を追加する。

**Tech Stack:** Firebase 11.x (`firebase/app`, `firebase/auth`)、React Router v7、Vitest + @testing-library/react（ProtectedRoute テスト用）

---

## ファイル変更一覧

| ファイル | 変化 | 内容 |
|---------|------|------|
| `package.json` | 変更 | `firebase` 追加、dev に `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` 追加 |
| `vitest.config.ts` | 新規 | jsdom 環境・globals設定 |
| `app/test-setup.ts` | 新規 | `@testing-library/jest-dom` import |
| `react-router.config.ts` | 変更 | `ssr: false` |
| `app/context/AuthContext.tsx` | 新規 | Firebase 初期化・認証状態・signInWithGoogle・signOut |
| `app/components/ProtectedRoute.tsx` | 新規 | loading 中はスピナー、未認証は `/` にリダイレクト |
| `app/components/__tests__/ProtectedRoute.test.tsx` | 新規 | ProtectedRoute の3ケーステスト |
| `app/components/LoginScreen.tsx` | 新規 | Googleサインインボタン・エラー表示 |
| `app/routes/login.tsx` | 新規 | `/` ルート。認証済みなら `/menu` にリダイレクト |
| `app/routes/menu.tsx` | 新規 | `/menu` ルート（home.tsx の役割を引き継ぐ） |
| `app/routes/home.tsx` | 削除 | login.tsx・menu.tsx に役割を移譲 |
| `app/routes/play.tsx` | 変更 | ProtectedRoute でラップ、リダイレクト先を `/menu` に変更 |
| `app/routes.ts` | 変更 | `/` → login.tsx、`/menu` 追加 |
| `app/root.tsx` | 変更 | AuthProvider を GameProvider の外側に追加、GitHub Pages スクリプト追加 |
| `public/404.html` | 新規 | GitHub Pages の SPA ルーティング対応 |

---

### Task 1: Firebase インストール + SPA モード設定 + テスト環境セットアップ

**Files:**
- Modify: `package.json`
- Modify: `react-router.config.ts`
- Create: `vitest.config.ts`
- Create: `app/test-setup.ts`

- [x] **Step 1: Firebase と testing ライブラリをインストール**

```bash
cd /path/to/project
npm install firebase
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

期待出力: `added N packages` というメッセージが表示される。エラーなし。

- [x] **Step 2: `react-router.config.ts` を SPA モードに変更**

```typescript
// react-router.config.ts
import type { Config } from "@react-router/dev/config";

export default {
  ssr: false,
} satisfies Config;
```

- [x] **Step 3: `vitest.config.ts` を作成（React コンポーネントテスト用）**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./app/test-setup.ts'],
  },
});
```

- [x] **Step 4: `app/test-setup.ts` を作成**

```typescript
// app/test-setup.ts
import '@testing-library/jest-dom';
```

- [ ] **Step 5: 既存テストが通ることを確認**

```bash
npm test
```

期待出力: `typingEngine` の既存テストが全て PASS する。

- [ ] **Step 6: コミット**

```bash
git add react-router.config.ts vitest.config.ts app/test-setup.ts package.json package-lock.json
git commit -m "feat: install firebase, setup SPA mode and jsdom test environment"
```

---

### Task 2: AuthContext（Firebase 初期化・認証状態管理）

**Files:**
- Create: `app/context/AuthContext.tsx`

- [ ] **Step 1: `app/context/AuthContext.tsx` を作成**

```typescript
// app/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import type { User } from 'firebase/auth';

const firebaseConfig = {
  apiKey:     import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:  import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId:      import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

- [ ] **Step 2: 型チェックを実行**

```bash
npm run typecheck
```

期待出力: エラーなし（`@react-router/dev` が型を生成するため、routes 関連の警告は後のタスクで解消される）。

- [ ] **Step 3: コミット**

```bash
git add app/context/AuthContext.tsx
git commit -m "feat: add AuthContext with Firebase Google Sign-In"
```

---

### Task 3: ProtectedRoute コンポーネント + テスト

**Files:**
- Create: `app/components/ProtectedRoute.tsx`
- Create: `app/components/__tests__/ProtectedRoute.test.tsx`

- [ ] **Step 1: テストを先に作成（TDD）**

```typescript
// app/components/__tests__/ProtectedRoute.test.tsx
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ProtectedRoute } from '../ProtectedRoute';

vi.mock('react-router', () => ({
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to} />,
}));

const mockUseAuth = vi.fn();
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it('loading 中はスピナーを表示し、children を表示しない', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
    });
    render(<ProtectedRoute><div>child content</div></ProtectedRoute>);
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
    expect(screen.queryByText('child content')).not.toBeInTheDocument();
  });

  it('未認証かつ loading=false の場合、/ への Navigate を返す', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
    });
    render(<ProtectedRoute><div>child content</div></ProtectedRoute>);
    const nav = screen.getByTestId('navigate');
    expect(nav).toHaveAttribute('data-to', '/');
    expect(screen.queryByText('child content')).not.toBeInTheDocument();
  });

  it('認証済みの場合、children を表示する', () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'test-user-123' } as any,
      loading: false,
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
    });
    render(<ProtectedRoute><div>child content</div></ProtectedRoute>);
    expect(screen.getByText('child content')).toBeInTheDocument();
    expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: テストを実行し、FAIL することを確認**

```bash
npm test -- ProtectedRoute.test.tsx
```

期待出力: `Cannot find module '../ProtectedRoute'` のようなエラーで FAIL する。

- [ ] **Step 3: `app/components/ProtectedRoute.tsx` を作成**

```tsx
// app/components/ProtectedRoute.tsx
import { Navigate } from 'react-router';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading-spinner">読み込み中...</div>;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}
```

- [ ] **Step 4: テストを実行し、3件全て PASS することを確認**

```bash
npm test -- ProtectedRoute.test.tsx
```

期待出力:
```
✓ loading 中はスピナーを表示し、children を表示しない
✓ 未認証かつ loading=false の場合、/ への Navigate を返す
✓ 認証済みの場合、children を表示する
Test Files  1 passed
```

- [ ] **Step 5: コミット**

```bash
git add app/components/ProtectedRoute.tsx app/components/__tests__/ProtectedRoute.test.tsx
git commit -m "feat: add ProtectedRoute with loading/auth guard (TDD)"
```

---

### Task 4: LoginScreen コンポーネント

**Files:**
- Create: `app/components/LoginScreen.tsx`

- [ ] **Step 1: `app/components/LoginScreen.tsx` を作成**

```tsx
// app/components/LoginScreen.tsx
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export function LoginScreen() {
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    try {
      setError(null);
      await signInWithGoogle();
    } catch {
      setError('Googleサインインに失敗しました。もう一度お試しください。');
    }
  };

  return (
    <div className="login-screen">
      <h2>ログイン</h2>
      <p>タイピング練習を始めるにはGoogleアカウントでログインしてください。</p>
      <button onClick={handleSignIn} className="google-signin-btn">
        Googleでサインイン
      </button>
      {error && <p className="login-error">{error}</p>}
    </div>
  );
}
```

注意: `signInWithGoogle()` が成功すると `onAuthStateChanged` が発火し、`AuthContext` の `user` が更新される。ナビゲーションは `login.tsx` ルート（Task 5）側の `useEffect` が担う。

- [ ] **Step 2: 型チェック**

```bash
npm run typecheck
```

- [ ] **Step 3: コミット**

```bash
git add app/components/LoginScreen.tsx
git commit -m "feat: add LoginScreen with Google sign-in button"
```

---

### Task 5: `/` ルート（login.tsx）

**Files:**
- Create: `app/routes/login.tsx`

- [ ] **Step 1: `app/routes/login.tsx` を作成**

認証済みユーザーが `/` を訪問したとき `/menu` にリダイレクトする。未認証のときは `LoginScreen` を表示する。

```tsx
// app/routes/login.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import type { Route } from './+types/login';
import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../components/LoginScreen';

export function meta({}: Route.MetaArgs) {
  return [
    { title: "aio-typing" },
    { name: "description", content: "ALL IN ONE タイピングゲーム" },
  ];
}

export default function Login() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/menu', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) return <div className="loading-spinner">読み込み中...</div>;
  return <LoginScreen />;
}
```

- [ ] **Step 2: 型チェック（`+types/login` は routes.ts 更新後に生成されるため、一時的に警告が出てもよい）**

```bash
npm run typecheck
```

- [ ] **Step 3: コミット**

```bash
git add app/routes/login.tsx
git commit -m "feat: add login route - redirect to /menu if already authenticated"
```

---

### Task 6: `/menu` ルート（menu.tsx）+ home.tsx 削除

**Files:**
- Create: `app/routes/menu.tsx`
- Delete: `app/routes/home.tsx`

- [ ] **Step 1: `app/routes/menu.tsx` を作成**

現在の `home.tsx` の役割をそのまま移植し、`ProtectedRoute` でラップする。

```tsx
// app/routes/menu.tsx
import { useGameContext } from '../context/GameContext';
import { MenuScreen } from '../components/MenuScreen';
import { ProtectedRoute } from '../components/ProtectedRoute';

export default function Menu() {
  const { display, settings, updateSettings, startGame } = useGameContext();
  return (
    <ProtectedRoute>
      <MenuScreen
        categories={display.categories}
        settings={settings}
        onUpdateSettings={updateSettings}
        onStart={startGame}
      />
    </ProtectedRoute>
  );
}
```

- [ ] **Step 2: `app/routes/home.tsx` を削除**

```bash
git rm app/routes/home.tsx
```

- [ ] **Step 3: コミット（削除と追加をまとめて）**

```bash
git add app/routes/menu.tsx
git commit -m "feat: add /menu route with ProtectedRoute, remove home.tsx"
```

---

### Task 7: `routes.ts` 更新

**Files:**
- Modify: `app/routes.ts`

- [ ] **Step 1: `app/routes.ts` を更新**

```typescript
// app/routes.ts
import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/login.tsx"),
  route("menu", "routes/menu.tsx"),
  route("play", "routes/play.tsx"),
  route(".well-known/appspecific/com.chrome.devtools.json", "routes/dummy.tsx"),
] satisfies RouteConfig;
```

- [ ] **Step 2: 型チェック（`+types/login`, `+types/menu` が生成される）**

```bash
npm run typecheck
```

期待出力: エラーなし（型ファイルが自動生成される）。

- [ ] **Step 3: コミット**

```bash
git add app/routes.ts
git commit -m "feat: update routes - / to login.tsx, add /menu"
```

---

### Task 8: `root.tsx` 更新（AuthProvider + GitHub Pages スクリプト）

**Files:**
- Modify: `app/root.tsx`

- [ ] **Step 1: `app/root.tsx` を更新**

`AuthProvider` を `GameProvider` の外側に追加し、`Layout` の `<head>` に GitHub Pages URL 復元スクリプトを追加する。

```tsx
// app/root.tsx
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
import { AuthProvider } from "./context/AuthContext";
import { GameProvider } from "./context/GameContext";

export const links: Route.LinksFunction = () => [];

const githubPagesSpaScript = `(function(){var r=sessionStorage.redirect;delete sessionStorage.redirect;if(r&&r!==location.href)history.replaceState(null,null,r);})();`;

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <script dangerouslySetInnerHTML={{ __html: githubPagesSpaScript }} />
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
    <AuthProvider>
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
    </AuthProvider>
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

- [ ] **Step 2: 型チェック**

```bash
npm run typecheck
```

- [ ] **Step 3: コミット**

```bash
git add app/root.tsx
git commit -m "feat: add AuthProvider to root, add GitHub Pages SPA script"
```

---

### Task 9: `play.tsx` 更新（ProtectedRoute ラップ + リダイレクト先修正）

**Files:**
- Modify: `app/routes/play.tsx`

- [ ] **Step 1: `app/routes/play.tsx` を更新**

未認証ガードを `ProtectedRoute` に委ねる。カテゴリ未選択時のリダイレクト先を `/` から `/menu` に変更する。

```tsx
// app/routes/play.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useGameContext } from '../context/GameContext';
import { PlayingScreen } from '../components/PlayingScreen';
import { ResultScreen } from '../components/ResultScreen';
import { ProtectedRoute } from '../components/ProtectedRoute';

export default function Play() {
  const { display, cleanup } = useGameContext();
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
    if (display.phase === 'playing') return <PlayingScreen display={display} />;
    if (display.phase === 'result') return <ResultScreen display={display} />;
    return null;
  })();

  return <ProtectedRoute>{content}</ProtectedRoute>;
}
```

- [ ] **Step 2: 型チェック**

```bash
npm run typecheck
```

- [ ] **Step 3: コミット**

```bash
git add app/routes/play.tsx
git commit -m "feat: wrap play route with ProtectedRoute, fix redirect to /menu"
```

---

### Task 10: GitHub Pages 対応 `public/404.html` 追加

**Files:**
- Create: `public/404.html`

- [ ] **Step 1: `public/404.html` を作成**

GitHub Pages で `/menu` や `/play` に直アクセスされたとき `404.html` が返るので、そこから `/` にリダイレクトし、元の URL を `sessionStorage` に保存する。`index.html`（root.tsx の Layout）側でこれを復元する。

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>aio-typing</title>
  <script>sessionStorage.redirect = location.href;</script>
  <meta http-equiv="refresh" content="0;URL='/'">
</head>
<body></body>
</html>
```

- [ ] **Step 2: 全テストが通ることを確認**

```bash
npm test
```

期待出力: 全テスト PASS。

- [ ] **Step 3: ビルドが通ることを確認（SPA モード）**

```bash
npm run build
```

期待出力: `build/client/index.html` が生成される。エラーなし。

- [ ] **Step 4: 開発サーバーで動作確認**

```bash
npm run dev
```

ブラウザで以下を確認:
- `http://localhost:5173/` → ログイン画面が表示される
- Googleサインインボタンをクリック → Google認証ポップアップが開く
- 認証成功後 → `/menu` に遷移する
- `/menu` に直アクセス → 未認証の場合 `/` にリダイレクトされる
- `/play` に直アクセス → 未認証の場合 `/` にリダイレクトされる

- [ ] **Step 5: コミット**

```bash
git add public/404.html
git commit -m "feat: add 404.html for GitHub Pages SPA routing support"
```

---

## 動作確認チェックリスト

| シナリオ | 期待動作 |
|----------|----------|
| 未認証で `/` にアクセス | LoginScreen が表示される |
| 未認証で `/menu` にアクセス | `/` にリダイレクトされる |
| 未認証で `/play` にアクセス | `/` にリダイレクトされる |
| Googleサインインボタンクリック | Google認証ポップアップが開く |
| 認証成功後 | `/menu` に遷移する |
| 認証済みで `/` にアクセス | `/menu` に自動リダイレクトされる |
| Firebase 初期化中（loading） | スピナーが表示される（フラッシュなし） |
| `/menu` でカテゴリ選択して START | `/play` に遷移する |
| `/play` で Escape | `/menu` に戻る（未認証なら `/` に戻る） |

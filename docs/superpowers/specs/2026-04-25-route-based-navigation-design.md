# Route-Based Navigation Design

## 概要

ゲームフェーズ（menu / playing / result）をコンポーネント state から React Router のルートに移行する。
`/` がメニュー、`/play` がプレイ・結果画面を担う2ルート構成にする。
ルート間の状態共有は React Context（GameContext）で行う。

## ルート構成

| URL | ファイル | 役割 |
|-----|---------|------|
| `/` | `app/routes/home.tsx` | MenuScreen を描画 |
| `/play` | `app/routes/play.tsx` | PlayingScreen または ResultScreen を描画 |

### 画面遷移フロー

```
/ (MenuScreen)
  └─ START ボタン → startGame() → navigate('/play')

/play (PlayingScreen)
  └─ 1文完了 → showResult() → phase='result'（URL は /play のまま）

/play (ResultScreen)
  ├─ Enter → nextContent()（/play のまま継続）
  ├─ Enter（最終問題後）→ gotoMenu() → navigate('/')
  └─ Escape → gotoMenu() → navigate('/')

/play に直アクセス（phase='menu'）→ navigate('/') にリダイレクト
```

## アーキテクチャ

### GameContext（新規: `app/context/GameContext.tsx`）

ゲーム全状態を保持する React Context。`app/root.tsx` の `App()` 内で `<GameProvider>` としてマウントし、全ルートから `useGameContext()` で参照できる。

```
GameProvider
├── useSettings()          ← 既存フックをそのまま流用
├── useNavigate()          ← React Router から取得
├── useGameState(csvPath, settings, navigate)
│     ├── gotoMenu()  → navigate('/')
│     └── startGame() → navigate('/play')
└── Context.Provider に以下を公開
      ├── display        (GameDisplay)
      ├── settings       (Settings)
      ├── updateSettings (Partial<Settings> → void)
      ├── startGame      (() → void)
      └── cleanup        (() → void)  ← ブラウザ戻るボタン対応
```

### useGameState の変更

引数に `navigate` を1つ追加するだけ。内部ロジックの変更は `gotoMenu()` と `startGame()` のみ。

```typescript
// 変更前
export function useGameState(csvPath: string, settings: Settings)

// 変更後
export function useGameState(csvPath: string, settings: Settings, navigate: (to: string) => void)
```

## ファイル変更一覧

| ファイル | 変化 | 内容 |
|---------|------|------|
| `app/context/GameContext.tsx` | **新規** | GameProvider・useGameContext を定義 |
| `app/routes/play.tsx` | **新規** | `/play` ルート。phase に応じて PlayingScreen/ResultScreen を描画 |
| `app/routes/home.tsx` | **変更** | TypingGame を外し MenuScreen を直接描画 |
| `app/root.tsx` | **変更** | `App()` の `<Outlet />` を `<GameProvider>` でラップ |
| `app/routes.ts` | **変更** | `/play` ルートを追加 |
| `app/hooks/useGameState.ts` | **変更** | `navigate` 引数を追加、gotoMenu/startGame に navigate 呼び出しを追加 |
| `app/components/TypingGame.tsx` | **削除** | 役割が Context とルートに分散するため不要 |

## エラーハンドリング

| ケース | 対応 |
|--------|------|
| `/play` に直接アクセス（phase=`'menu'`） | `play.tsx` の `useEffect` で `navigate('/')` にリダイレクト |
| CSV ロード失敗 | 既存の `.catch(console.error)` を維持 |
| ブラウザの「戻る」ボタンで `/play` を離脱 | `play.tsx` のアンマウント時に `cleanup()` を呼び audio・timer を停止 |

## スコープ外（将来対応）

- URL パラメータによる出題インデックス管理（`/play?idx=3`）
- `clientLoader` を使った CSV のサーバーレス事前ロード

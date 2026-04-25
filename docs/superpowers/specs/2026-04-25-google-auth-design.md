# Google認証 Design

## 概要

Firebase Authentication（Google Sign-In）を追加し、`/` をログイン画面に、現在の `/` を `/menu` に移動する。
未認証ユーザーが `/menu` や `/play` にアクセスした場合は `/` にリダイレクトする。
同時に GitHub Pages 対応のため SSR を無効化して SPA モードに切り替える。

## ルート構成

| URL | 変更前 | 変更後 | 認証ガード |
|-----|--------|--------|-----------|
| `/` | MenuScreen | LoginScreen（新規） | 不要 |
| `/menu` | なし | MenuScreen（現 `/` を移動） | 必要 |
| `/play` | PlayingScreen/ResultScreen | 変更なし | 必要 |

### 画面遷移フロー

```
/ (LoginScreen)
  ├─ 認証済みで訪問 → navigate('/menu', { replace: true })
  └─ Googleサインインボタン → Firebase Google認証
       ├─ 成功 → navigate('/menu')
       └─ 失敗 → エラーメッセージ表示（/ のまま）

/menu (ProtectedRoute → MenuScreen)
  ├─ 未認証 → navigate('/', { replace: true })
  ├─ loading 中 → スピナー表示
  └─ 認証済み → MenuScreen 表示
       └─ START → navigate('/play')

/play (ProtectedRoute → PlayingScreen/ResultScreen)
  ├─ 未認証 → navigate('/', { replace: true })
  ├─ loading 中 → スピナー表示
  └─ 認証済み → ゲーム継続
```

## アーキテクチャ

### Provider の入れ子

```
<AuthProvider>          ← Firebase認証状態（root.tsx の App() 最外層）
  <GameProvider>        ← ゲーム状態（認証後のみ有効）
    <Outlet />
  </GameProvider>
</AuthProvider>
```

### AuthContext（新規: `app/context/AuthContext.tsx`）

```typescript
interface AuthContextValue {
  user: FirebaseUser | null;   // null = 未認証
  loading: boolean;            // Firebase 初期化中フラグ
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}
```

`loading` フラグ: Firebase は初期化時に認証状態を非同期で復元する。
`loading === true` の間はルートガードを判定せずスピナーを表示し、フラッシュ（一瞬 `/` にリダイレクトされる現象）を防ぐ。

### Firebase 初期化

Firebase の初期化はモジュールレベルではなく関数内で遅延実行する。
`react-router dev` が Node.js 環境でモジュールを読み込む際に Firebase のブラウザ API（IndexedDB 等）が存在せずエラーになるため。

```typescript
const firebaseConfig = {
  apiKey:      import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:   import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId:       import.meta.env.VITE_FIREBASE_APP_ID,
};

function getFirebaseAuth() {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  return getAuth(app);
}
```

`getApps().length === 0` のチェックで Firebase は1回だけ初期化される。
`useEffect` やイベントハンドラから `getFirebaseAuth()` を呼ぶことで、ブラウザ環境でのみ実行される。

## ファイル変更一覧

| ファイル | 変化 | 内容 |
|---------|------|------|
| `app/context/AuthContext.tsx` | **新規** | Firebase 初期化・認証状態・signInWithGoogle・signOut |
| `app/components/ProtectedRoute.tsx` | **新規** | loading 中はスピナー、未認証は `/` にリダイレクト |
| `app/components/LoginScreen.tsx` | **新規** | Googleサインインボタン・エラー表示 |
| `app/routes/login.tsx` | **新規** | `/` ルート。認証済みなら `/menu` にリダイレクト |
| `app/routes/menu.tsx` | **新規** | `/menu` ルート（現 home.tsx の役割） |
| `app/routes/home.tsx` | **削除** | login.tsx に役割を移譲 |
| `app/routes/play.tsx` | **変更** | ProtectedRoute でラップ |
| `app/routes.ts` | **変更** | `/` → login.tsx、`/menu` 追加 |
| `app/root.tsx` | **変更** | AuthProvider を GameProvider の外側に追加 |
| `react-router.config.ts` | **変更** | `ssr: true` → `ssr: false` で SPA モードに変更（既存ファイル） |
| `public/404.html` | **新規** | GitHub Pages の SPA ルーティング対応 |
| `.env` | **新規（gitignore）** | Firebase 設定値（ローカル開発用） |
| `.gitignore` | **変更なし** | `.env` は実装前から既に除外済み |

## 環境変数

| 変数名 | 説明 |
|--------|------|
| `VITE_FIREBASE_API_KEY` | Firebase API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID |
| `VITE_FIREBASE_APP_ID` | Firebase App ID |

ローカル開発: `.env` ファイルに記述（`.gitignore` で除外）。
GitHub Pages デプロイ: GitHub Secrets に登録し GitHub Actions で注入（別改修でスコープ外）。

## Firebase セットアップ確認手順

1. Firebase Console → プロジェクト設定 → ウェブアプリ設定値を `.env` に記述
2. Firebase Console → Authentication → Sign-in method → **Google が有効**になっていること
3. Firebase Console → Authentication → Settings → 承認済みドメインに以下を追加:
   - `localhost`（開発用、デフォルトで追加済みのはず）
   - `<username>.github.io`（デプロイ後に追加、今回はスコープ外）

## GitHub Pages の SPA ルーティング対応

GitHub Pages では `/menu` や `/play` に直接アクセスすると 404 になる。
`public/404.html` にリダイレクトスクリプトを置き、`index.html` で URL を復元する。

```html
<!-- public/404.html -->
<script>
  sessionStorage.redirect = location.href;
</script>
<meta http-equiv="refresh" content="0;URL='/'">
```

```html
<!-- index.html の <head> 内（vite-plugin か index.html 直接編集）-->
<script>
  (function() {
    var redirect = sessionStorage.redirect;
    delete sessionStorage.redirect;
    if (redirect && redirect !== location.href) {
      history.replaceState(null, null, redirect);
    }
  })();
</script>
```

## スコープ外

- GitHub Actions デプロイワークフロー（別改修）
- Firebase Firestore によるユーザーデータ保存（将来対応）
- ユーザーごとの設定・進捗の永続化（将来対応）

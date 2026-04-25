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

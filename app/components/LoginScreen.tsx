// app/components/LoginScreen.tsx
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export function LoginScreen() {
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    try {
      setError(null);
      setIsLoading(true);
      await signInWithGoogle();
    } catch {
      setError('Googleサインインに失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-avatar">🔑</div>
        <h2 className="login-title">Sign in</h2>
        <p className="login-desc">タイピング練習にはGoogleアカウントが必要です。</p>
        <button
          onClick={handleSignIn}
          disabled={isLoading}
          className={`google-signin-btn${isLoading ? ' google-signin-btn--disabled' : ''}`}
        >
          <span className="google-signin-btn__icon">
            <img src="/google-icon.svg" alt="Google" width="46" height="46" />
          </span>
          <span className="google-signin-btn__text">
            {isLoading ? 'サインイン中...' : 'Sign in with Google'}
          </span>
        </button>
        {error && <p className="login-error">{error}</p>}
        <p className="login-copyright">© {new Date().getFullYear()} sg.tao.so@gmail.com</p>
      </div>
    </div>
  );
}

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

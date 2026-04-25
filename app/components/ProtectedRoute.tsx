// app/components/ProtectedRoute.tsx
import { Navigate } from 'react-router';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading-spinner">読み込み中...</div>;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

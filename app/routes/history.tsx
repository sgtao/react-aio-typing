// app/routes/history.tsx
import { HistoryScreen } from '../components/HistoryScreen';
import { ProtectedRoute } from '../components/ProtectedRoute';

export default function History() {
  return (
    <ProtectedRoute>
      <HistoryScreen />
    </ProtectedRoute>
  );
}

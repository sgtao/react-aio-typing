// app/routes/menu.tsx
import type { Route } from "./+types/menu";
import { useNavigate } from 'react-router';
import { useGameContext } from '../context/GameContext';
import { MenuScreen } from '../components/MenuScreen';
import { ProtectedRoute } from '../components/ProtectedRoute';

export function meta({}: Route.MetaArgs) {
  return [
    { title: "aio-typing" },
    { name: "description", content: "ALL IN ONE タイピングゲーム" },
  ];
}

export default function Menu() {
  const { display, settings, updateSettings, startGame } = useGameContext();
  const navigate = useNavigate();
  return (
    <ProtectedRoute>
      <MenuScreen
        categories={display.categories}
        settings={settings}
        onUpdateSettings={updateSettings}
        onStart={startGame}
        onHistory={() => navigate('/history')}
      />
    </ProtectedRoute>
  );
}

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

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useSettings } from '../hooks/useSettings';
import { useGameState } from '../hooks/useGameState';
import type { GameDisplay } from '../hooks/useGameState';
import type { Settings } from '../hooks/useSettings';

const CSV_PATH = '/allinone-text-contents.csv';

interface GameContextValue {
  display: GameDisplay;
  settings: Settings;
  updateSettings: (partial: Partial<Settings>) => void;
  startGame: () => void;
  cleanup: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { settings, updateSettings } = useSettings();
  const { display, startGame, cleanup } = useGameState(CSV_PATH, settings, navigate);

  useEffect(() => {
    if (display.categories.length > 0 && settings.category === null) {
      updateSettings({ category: display.categories[0] });
    }
  }, [display.categories, settings.category, updateSettings]);

  return (
    <GameContext.Provider value={{ display, settings, updateSettings, startGame, cleanup }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGameContext(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGameContext must be used within GameProvider');
  return ctx;
}

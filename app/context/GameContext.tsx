import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useSettings } from '../hooks/useSettings';
import { useGameState } from '../hooks/useGameState';
import type { GameDisplay } from '../hooks/useGameState';
import type { Settings } from '../hooks/useSettings';

const CSV_PATH = `${import.meta.env.BASE_URL}assets/`;

interface GameContextValue {
  display: GameDisplay;
  settings: Settings;
  updateSettings: (partial: Partial<Settings>) => void;
  startGame: () => void;
  startGameWithCategory: (cat: string) => void;
  cleanup: () => void;
  toggleAudio: () => void;
  goToNextContent: () => void;
  setVoiceMode: (active: boolean) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { settings, updateSettings } = useSettings();
  const { display, startGame, startGameWithCategory, cleanup, toggleAudio, goToNextContent, setVoiceMode } = useGameState(CSV_PATH, settings, navigate);

  useEffect(() => {
    if (display.categories.length > 0 && settings.category === null) {
      updateSettings({ category: display.categories[0] });
    }
  }, [display.categories, settings.category, updateSettings]);

  function handleStartGameWithCategory(cat: string) {
    updateSettings({ category: cat });
    startGameWithCategory(cat);
  }

  return (
    <GameContext.Provider value={{ display, settings, updateSettings, startGame, startGameWithCategory: handleStartGameWithCategory, cleanup, toggleAudio, goToNextContent, setVoiceMode }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGameContext(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGameContext must be used within GameProvider');
  return ctx;
}

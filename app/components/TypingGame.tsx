import { useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import { useGameState } from '../hooks/useGameState';
import { MenuScreen } from './MenuScreen';
import { PlayingScreen } from './PlayingScreen';
import { ResultScreen } from './ResultScreen';
import '../styles/game.css';

const CSV_PATH = '/allinone-text-contents.csv';

export function TypingGame() {
  const { settings, updateSettings } = useSettings();
  const { display, startGame } = useGameState(CSV_PATH, settings);

  useEffect(() => {
    if (display.categories.length > 0 && settings.category === null) {
      updateSettings({ category: display.categories[0] });
    }
  }, [display.categories, settings.category, updateSettings]);

  return (
    <div className="game-container">
      <header>
        <h1>aio-typing</h1>
        <p>
          書籍『
          <a
            href="https://linkage-club.net/books#all"
            target="_blank"
            rel="noopener noreferrer"
          >
            ALL IN ONE
          </a>
          』のタイピングソフトを簡単にしてみる。
        </p>
      </header>

      {display.phase === 'menu' && (
        <MenuScreen
          categories={display.categories}
          settings={settings}
          onUpdateSettings={updateSettings}
          onStart={startGame}
        />
      )}
      {display.phase === 'playing' && <PlayingScreen display={display} />}
      {display.phase === 'result' && <ResultScreen display={display} />}

      <footer>
        <p>
          <a
            href="https://github.com/sgtao/aio-typing/"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}

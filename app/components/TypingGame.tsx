import { useGameState } from '../hooks/useGameState';
import { MenuScreen } from './MenuScreen';
import { PlayingScreen } from './PlayingScreen';
import '../styles/game.css';

const ASSET_FILE = '/assets-sample.json';

export function TypingGame() {
  const { display } = useGameState(ASSET_FILE);

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

      {display.phase === 'menu' ? (
        <MenuScreen />
      ) : (
        <PlayingScreen display={display} />
      )}

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

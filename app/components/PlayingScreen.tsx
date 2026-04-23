import { LiveStats } from './LiveStats';
import type { GameDisplay } from '../hooks/useGameState';

interface Props {
  display: GameDisplay;
}

function TypingDisplay({ display }: Props) {
  const { typed, enginePosition, targetText, pendingMask } = display;

  return (
    <p className="target-word">
      {targetText.split('').map((ch, i) => {
        if (i < typed.length) {
          const t = typed[i];
          if (t.auto) return <span key={i} className="char-auto">{ch}</span>;
          return (
            <span key={i} className={t.correct ? 'char-correct' : 'char-wrong'}>
              {ch}
            </span>
          );
        }
        const displayChar = pendingMask ? pendingMask[i] : ch;
        if (i === enginePosition) {
          return <span key={i} className="char-cursor">{displayChar}</span>;
        }
        return <span key={i} className="char-pending">{displayChar}</span>;
      })}
    </p>
  );
}

export function PlayingScreen({ display }: Props) {
  const { category, currentIndex, hintText, translateText, translationMode, wpm, accuracy, elapsed } = display;

  return (
    <>
      <p className="instruction">
        Enter=音声再生・停止／Tab=訳切替／Esc=リセット
      </p>

      <div className="category-index">
        <div>
          <span className="category">{category}</span>
          <span className="index">{currentIndex}</span>
        </div>
      </div>

      {hintText && <p className="hint-text">{hintText}</p>}

      <p className="translate-text">
        <span className="translate-label">
          {translationMode === 'slashed' ? 'スラッシュ訳' : '自然な訳'}：
        </span>
        {translateText}
      </p>

      <TypingDisplay display={display} />

      <LiveStats wpm={wpm} accuracy={accuracy} elapsed={elapsed} />
    </>
  );
}

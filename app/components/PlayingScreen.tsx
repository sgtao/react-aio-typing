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
  const { category, currentIndex, hintText, targetText, translateText, translationMode, escWarning, mode, shiftHintActive, wpm, accuracy, elapsed } = display;

  const displayedHint = shiftHintActive ? targetText : hintText;

  return (
    <>
      <p className="instruction">
        {mode === 'composition'
          ? 'Enter=音声再生・停止／Tab=訳切替／Esc=リセット(未入力でメニュー)／Shift=全文表示'
          : 'Enter=音声再生・停止／Tab=訳切替／Esc=リセット(未入力でメニュー)'}
      </p>

      <div className="category-index">
        <div>
          <span className="category">{category}</span>
          <span className="index">{currentIndex}</span>
        </div>
      </div>

      <p className="hint-text">
        <span className="translate-label">
          {translationMode === 'slashed' ? 'スラッシュ訳' : '自然な訳'}：
        </span>
        {translateText}
      </p>

      {displayedHint && <p className="translate-text">{displayedHint}</p>}

      {escWarning && (
        <p className="esc-warning">もう一度 ESC を押すとメニューに戻ります</p>
      )}

      <TypingDisplay display={display} />

      <LiveStats wpm={wpm} accuracy={accuracy} elapsed={elapsed} />
    </>
  );
}

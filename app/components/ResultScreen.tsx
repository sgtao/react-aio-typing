import type { GameDisplay } from '../hooks/useGameState';

interface Props {
  display: GameDisplay;
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function ResultScreen({ display }: Props) {
  const { results, targetText, translateText, translationMode } = display;
  if (!results) return null;

  return (
    <>
      <p className="instruction">Enter=次の文へ／Tab=訳切替／Esc=メニューへ戻る</p>

      <p className="hint-text">
        <span className="translate-label">
          {translationMode === 'slashed' ? 'スラッシュ訳' : '自然な訳'}：
        </span>
        {translateText}
      </p>

      <div className="result-stats">
        <span className="result-stat-item">
          <span className="result-stat-value">{results.wpm}</span>
          <span className="result-stat-label">WPM</span>
        </span>
        <span className="result-stat-item">
          <span className="result-stat-value">{results.accuracy}%</span>
          <span className="result-stat-label">正確性</span>
        </span>
        <span className="result-stat-item">
          <span className="result-stat-value">{formatTime(results.elapsed)}</span>
          <span className="result-stat-label">タイム</span>
        </span>
      </div>

      <p className="target-word result-highlight">
        {targetText.split('').map((ch, i) => {
          const t = results.typed[i];
          if (!t) return <span key={i}>{ch}</span>;
          if (t.auto) return <span key={i} className="char-auto">{ch}</span>;
          return (
            <span key={i} className={t.correct ? 'char-correct' : 'char-wrong'}>
              {ch}
            </span>
          );
        })}
      </p>
    </>
  );
}

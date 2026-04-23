import type { GameDisplay } from '../hooks/useGameState';

interface Props {
  display: GameDisplay;
}

export function PlayingScreen({ display }: Props) {
  const { category, currentIndex, displayWord, translate, elapsedTime, phase } = display;

  return (
    <>
      <p className="instruction">
        Space=音声再生／Enter=次の文へ／Esc.=メニューへ戻る
      </p>
      <div className="category-index">
        <div>
          <span className="category">{category}</span>
          <span className="index">{currentIndex}</span>
        </div>
      </div>
      <p>{translate}</p>
      <p className="target-word">{displayWord}</p>
      {phase === 'complete' && <p>{elapsedTime}</p>}
    </>
  );
}

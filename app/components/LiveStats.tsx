interface Props {
  wpm: number;
  accuracy: number;
  elapsed: number;
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function LiveStats({ wpm, accuracy, elapsed }: Props) {
  return (
    <div className="live-stats">
      <span className="stat-item"><span className="stat-label">WPM</span>{wpm}</span>
      <span className="stat-item"><span className="stat-label">正確性</span>{accuracy}%</span>
      <span className="stat-item"><span className="stat-label">時間</span>{formatTime(elapsed)}</span>
    </div>
  );
}

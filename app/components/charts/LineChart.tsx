interface LineChartProps {
  data: number[];  // accuracy 値（古い順、最大30件）
}

export function LineChart({ data }: LineChartProps) {
  if (data.length <= 1) {
    return (
      <div style={{ textAlign: 'center', fontSize: '10px', opacity: 0.7, padding: '8px 0' }}>
        データなし
      </div>
    );
  }

  const W = 120;
  const H = 48;
  const PADDING_LEFT = 0;
  const PADDING_TOP = 4;
  const PADDING_BOTTOM = 4;
  const chartH = H - PADDING_TOP - PADDING_BOTTOM;

  // accuracy は 0〜100 のスケール
  const xStep = (W - PADDING_LEFT) / (data.length - 1);
  const toX = (i: number) => PADDING_LEFT + i * xStep;
  const toY = (v: number) => PADDING_TOP + chartH - (v / 100) * chartH;

  const points = data.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
  const lastX = toX(data.length - 1);
  const lastY = toY(data[data.length - 1]);
  const firstX = toX(0);
  const firstY = toY(data[0]);
  const areaPoints = `${firstX},${firstY} ${points} ${lastX},${H - PADDING_BOTTOM} ${firstX},${H - PADDING_BOTTOM}`;

  // グリッド線 Y 位置（25 / 50 / 75%）
  const gridYs = [75, 50, 25].map((v) => toY(v));

  return (
    <div style={{ marginTop: '6px' }}>
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="正答率の推移グラフ"
      >
        {gridYs.map((y, i) => (
          <line key={i} x1={PADDING_LEFT} y1={y} x2={W} y2={y}
            stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
        ))}
        <polygon points={areaPoints} fill="rgba(255,255,255,0.12)" />
        <polyline
          points={points}
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle cx={lastX} cy={lastY} r="3" fill="white" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
        <span style={{ fontSize: '8px', opacity: 0.7 }}>← 古い</span>
        <span style={{ fontSize: '8px', opacity: 0.7 }}>新しい →</span>
      </div>
    </div>
  );
}

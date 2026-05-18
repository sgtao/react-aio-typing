interface DonutChartProps {
  value: number;
  total: number;
}

export function DonutChart({ value, total }: DonutChartProps) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const filled = (pct / 100) * circumference;
  const gap = circumference - filled;

  return (
    <svg width="100" height="100" viewBox="0 0 100 100" role="img" aria-label={`${pct}% (${value}/${total})`}>
      <circle
        cx="50" cy="50" r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="13"
      />
      <circle
        cx="50" cy="50" r={radius}
        fill="none"
        stroke="white"
        strokeWidth="13"
        strokeDasharray={`${filled} ${gap}`}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
      />
      <text x="50" y="45" textAnchor="middle" fontSize="15" fill="white" fontWeight="700" aria-hidden="true">
        {pct}%
      </text>
      <text x="50" y="61" textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.75)" aria-hidden="true">
        {value}/{total}
      </text>
    </svg>
  );
}

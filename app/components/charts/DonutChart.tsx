interface DonutChartProps {
  value: number;
  total: number;
}

export function DonutChart({ value, total }: DonutChartProps) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const radius = 27;
  const circumference = 2 * Math.PI * radius;
  const filled = (pct / 100) * circumference;
  const gap = circumference - filled;

  return (
    <svg width="72" height="72" viewBox="0 0 72 72" aria-label={`${pct}%`}>
      <circle
        cx="36" cy="36" r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="11"
      />
      <circle
        cx="36" cy="36" r={radius}
        fill="none"
        stroke="white"
        strokeWidth="11"
        strokeDasharray={`${filled} ${gap}`}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
      />
      <text x="36" y="32" textAnchor="middle" fontSize="11" fill="white" fontWeight="700">
        {pct}%
      </text>
      <text x="36" y="44" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.75)">
        {value}/{total}
      </text>
    </svg>
  );
}

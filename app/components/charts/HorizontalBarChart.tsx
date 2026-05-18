interface BarItem {
  label: string;
  value: number;
  total: number;
}

interface HorizontalBarChartProps {
  items: BarItem[];
}

export function HorizontalBarChart({ items }: HorizontalBarChartProps) {
  const visibleItems = items.slice(0, 5);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '10px' }}>
      {visibleItems.map((item) => {
        const pct = item.total > 0 ? Math.round((item.value / item.total) * 100) : 0;
        const dim = pct === 0;
        return (
          <div key={item.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span style={{ fontSize: '8px', opacity: dim ? 0.55 : 0.9 }}>{item.label}</span>
              <span style={{ fontSize: '8px', opacity: dim ? 0.55 : 0.9 }}>{pct}%</span>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.25)',
              borderRadius: '3px',
              height: '7px',
            }}>
              {pct > 0 && (
                <div style={{
                  background: 'white',
                  width: `${pct}%`,
                  height: '100%',
                  borderRadius: '3px',
                }} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

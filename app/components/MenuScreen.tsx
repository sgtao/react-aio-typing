import type { Settings } from '../hooks/useSettings';

interface Props {
  categories: string[];
  settings: Settings;
  onUpdateSettings: (partial: Partial<Settings>) => void;
  onStart: () => void;
}

interface ToggleProps<T extends string | number | boolean> {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}

function ToggleGroup<T extends string | number | boolean>({
  label,
  options,
  value,
  onChange,
}: ToggleProps<T>) {
  return (
    <div className="settings-row">
      <span className="settings-label">{label}</span>
      <div className="toggle-group">
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            className={`toggle-btn${value === opt.value ? ' active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onChange(opt.value);
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function MenuScreen({ categories, settings, onUpdateSettings, onStart }: Props) {
  return (
    <>
      <p className="instruction">設定を選んでスタートしてください</p>

      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-row">
          <span className="settings-label">カテゴリ</span>
          <select
            className="category-select"
            value={settings.category ?? ''}
            onChange={(e) => onUpdateSettings({ category: e.target.value || null })}
          >
            {categories.length === 0 && <option value="">読み込み中...</option>}
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <ToggleGroup
          label="出題順"
          options={[
            { value: 'random' as const, label: 'ランダム' },
            { value: 'sequential' as const, label: '順番' },
          ]}
          value={settings.order}
          onChange={(v) => onUpdateSettings({ order: v })}
        />

        <ToggleGroup
          label="モード"
          options={[
            { value: 'typing' as const, label: 'タイピング' },
            { value: 'composition' as const, label: '英作文' },
          ]}
          value={settings.mode}
          onChange={(v) => onUpdateSettings({ mode: v })}
        />

        <ToggleGroup
          label="ミスタイプ"
          options={[
            { value: 'free' as const, label: 'フリー' },
            { value: 'strict' as const, label: 'ストリクト' },
          ]}
          value={settings.mistypeMode}
          onChange={(v) => onUpdateSettings({ mistypeMode: v })}
        />

        <ToggleGroup
          label="日本語訳"
          options={[
            { value: 'slashed' as const, label: 'スラッシュ訳' },
            { value: 'natural' as const, label: '自然な訳' },
          ]}
          value={settings.translation}
          onChange={(v) => onUpdateSettings({ translation: v })}
        />

        {settings.mode === 'composition' && (
          <ToggleGroup
            label="ヒントレベル"
            options={[
              { value: 1 as const, label: 'Lv.1 易' },
              { value: 2 as const, label: 'Lv.2 中' },
              { value: 3 as const, label: 'Lv.3 難' },
            ]}
            value={settings.hintLevel}
            onChange={(v) => onUpdateSettings({ hintLevel: v })}
          />
        )}
      </div>

      <button
        className="start-btn"
        disabled={!settings.category}
        onClick={(e) => {
          e.stopPropagation();
          onStart();
        }}
      >
        START (Enter)
      </button>
    </>
  );
}

// app/components/HistoryScreen.tsx
import { useState } from 'react';
import { historyStorage } from '../services/historyStorage';
import type { SessionRecord } from '../services/historyStorage';
import { csvLoader } from '../services/csvLoader';
import type { Sentence } from '../services/csvLoader';
import { useGameContext } from '../context/GameContext';

type Tab = 'category' | 'sessions' | 'weak';

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function barColor(pct: number): string {
  if (pct < 30)  return 'hsl(195, 70%, 73%)';
  if (pct < 50)  return 'hsl(172, 55%, 65%)';
  if (pct < 70)  return 'hsl(152, 52%, 60%)';
  if (pct < 90)  return 'hsl(142, 52%, 50%)';
  if (pct < 100) return 'hsl(140, 55%, 43%)';
  return          'hsl(138, 58%, 35%)';
}

function CategoryTab({ onCategoryResetRequest, onCategoryStart }: {
  onCategoryResetRequest: (cat: string) => void;
  onCategoryStart: (cat: string) => void;
}) {

  const sessions = historyStorage.getSessions();
  const attemptedNos = new Set(sessions.map((s) => s.no));
  const categories = csvLoader.getCategories();

  if (!csvLoader.getAll().length) {
    return <p className="history-empty">データ読み込み中...</p>;
  }

  return (
    <>
      {categories.map((cat) => {
        const catSentences = csvLoader.getByCategory(cat);
        const total = catSentences.length;
        const attempted = catSentences.filter((s) => attemptedNos.has(s.no)).length;
        const pct = total > 0 ? Math.round((attempted / total) * 100) : 0;
        return (
          <div key={cat} className="category-item">
            <div className="category-item-header">
              <span
                className="category-item-name"
                role="button"
                tabIndex={0}
                onClick={() => onCategoryStart(cat)}
                onKeyDown={(e) => e.key === 'Enter' && onCategoryStart(cat)}
              >
                {cat}
              </span>
              <div className="category-item-header-right">
                <span className="category-item-pct">{pct}%</span>
                <button
                  className="category-reset-btn"
                  onClick={() => onCategoryResetRequest(cat)}
                  title={`${cat} の履歴をリセット`}
                >
                  🗑
                </button>
              </div>
            </div>
            <div className="progress-bar-wrap">
              <div className="progress-bar" style={{ width: `${pct}%`, backgroundColor: barColor(pct) }} />
            </div>
            <div className="category-item-counts">
              {total} 問 ／ 挑戦済 {attempted} ／ 未挑戦 {total - attempted}
            </div>
          </div>
        );
      })}
    </>
  );
}

function SessionsTab({ sessions }: { sessions: SessionRecord[] }) {
  if (!sessions.length) {
    return <p className="history-empty">まだ学習記録がありません</p>;
  }

  return (
    <>
      {sessions.slice(0, 100).map((s, i) => (
        <div key={i} className="session-item">
          <div className="session-item-meta">
            {formatDate(s.timestamp)} | {s.mode === 'typing' ? 'タイピング' : '英作文'} | {s.category} {s.index}
          </div>
          <div className="session-item-scores">
            <span>{s.wpm} WPM</span>
            <span>{s.accuracy}%</span>
            <span>{formatTime(s.elapsed)}</span>
          </div>
        </div>
      ))}
    </>
  );
}

function WeakTab({ sessions }: { sessions: SessionRecord[] }) {
  const weakMap = historyStorage.getWeakMap();
  const allSentences = csvLoader.getAll();
  const sentenceMap = new Map<number, Sentence>(allSentences.map((s) => [s.no, s]));

  const accByNo = new Map<number, number[]>();
  sessions.forEach((s) => {
    if (!accByNo.has(s.no)) accByNo.set(s.no, []);
    accByNo.get(s.no)!.push(s.accuracy);
  });

  const weakList = Object.entries(weakMap)
    .map(([no, v]) => ({ no: parseInt(no, 10), mistypeCount: v.mistypeCount }))
    .sort((a, b) => b.mistypeCount - a.mistypeCount)
    .slice(0, 50);

  if (!weakList.length) {
    return <p className="history-empty">まだ学習記録がありません</p>;
  }

  return (
    <>
      {weakList.map((w) => {
        const sentence = sentenceMap.get(w.no);
        const accs = accByNo.get(w.no) ?? [];
        const avgAcc = accs.length > 0
          ? Math.round(accs.reduce((a, b) => a + b) / accs.length)
          : null;
        return (
          <div key={w.no} className="weak-item">
            <div className="weak-item-info">
              <div className="weak-item-meta">
                {sentence ? `${sentence.category} ${sentence.index}` : `#${w.no}`}
              </div>
              {sentence && (
                <div className="weak-item-text">
                  {sentence.englishText.slice(0, 80)}
                  {sentence.englishText.length > 80 ? '…' : ''}
                </div>
              )}
            </div>
            <div className="weak-count">
              <div>{w.mistypeCount} ミス</div>
              {avgAcc !== null && <div className="weak-avg-acc">avg {avgAcc}%</div>}
            </div>
          </div>
        );
      })}
    </>
  );
}

function ResetDialog({
  title,
  body,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <p className="modal-title">{title}</p>
        <p className="modal-body">{body}</p>
        <div className="modal-actions">
          <button className="modal-cancel-btn" onClick={onCancel}>
            キャンセル
          </button>
          <button className="modal-confirm-btn" onClick={onConfirm}>
            リセットする
          </button>
        </div>
      </div>
    </div>
  );
}

export function HistoryScreen() {
  const [activeTab, setActiveTab] = useState<Tab | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [categoryToReset, setCategoryToReset] = useState<string | null>(null);
  const { startGameWithCategory } = useGameContext();

  const allSentences = csvLoader.getAll();
  const sessions = historyStorage.getSessions();
  const attemptedNos = new Set(sessions.map((s) => s.no));
  const categories = csvLoader.getCategories();
  const totalAll = allSentences.length;
  const attemptedAll = allSentences.filter((s) => attemptedNos.has(s.no)).length;
  const completedCategories = categories.filter((cat) =>
    csvLoader.getByCategory(cat).every((s) => attemptedNos.has(s.no))
  ).length;
  const totalCategories = categories.length;
  const avgWpm = sessions.length > 0
    ? Math.round(sessions.reduce((sum, s) => sum + s.wpm, 0) / sessions.length)
    : null;
  const avgAccuracy = sessions.length > 0
    ? Math.round(sessions.reduce((sum, s) => sum + s.accuracy, 0) / sessions.length)
    : null;

  function handleCardClick(t: Tab) {
    setActiveTab((prev) => (prev === t ? null : t));
  }

  function handleReset() {
    historyStorage.clearAll();
    setShowResetDialog(false);
    setResetKey((k) => k + 1);
  }

  function handleCategoryReset(cat: string) {
    const nos = csvLoader.getByCategory(cat).map((s) => s.no);
    historyStorage.clearByCategory(cat, nos);
    setCategoryToReset(null);
    setResetKey((k) => k + 1);
  }

  return (
    <>
      <h2 className="history-title">学習履歴</h2>

      <div className="category-summary-stats">
        {(
          [
            {
              tab: 'category' as Tab,
              modifier: 'challenge',
              label: '挑戦数',
              value: <>{attemptedAll}<span className="summary-stat-total"> / {totalAll}</span></>,
              sub: null,
            },
            {
              tab: 'sessions' as Tab,
              modifier: 'complete',
              label: 'セクション完了',
              value: <>{completedCategories}<span className="summary-stat-total"> / {totalCategories}</span></>,
              sub: null,
            },
            {
              tab: 'weak' as Tab,
              modifier: 'stats',
              label: '平均 WPM / 正確率',
              value: avgWpm !== null ? `${avgWpm} WPM` : '—',
              sub: avgAccuracy !== null ? `${avgAccuracy}%` : '—',
            },
          ] as const
        ).map(({ tab, modifier, label, value, sub }) => (
          <div
            key={tab}
            className={`summary-stat-card summary-stat-card--${modifier}${activeTab === tab ? ' summary-stat-card--active' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => handleCardClick(tab)}
            onKeyDown={(e) => e.key === 'Enter' && handleCardClick(tab)}
          >
            <div className="summary-stat-label">{label}</div>
            <div className="summary-stat-value">{value}</div>
            {sub !== null && <div className="summary-stat-sub">{sub}</div>}
          </div>
        ))}
      </div>

      {activeTab !== null && (
        <div className="history-content" key={resetKey}>
          {activeTab === 'category' && (
            <CategoryTab
              onCategoryResetRequest={(cat) => setCategoryToReset(cat)}
              onCategoryStart={startGameWithCategory}
            />
          )}
          {activeTab === 'sessions' && <SessionsTab sessions={sessions} />}
          {activeTab === 'weak' && <WeakTab sessions={sessions} />}
        </div>
      )}

      <button className="history-reset-btn" onClick={() => setShowResetDialog(true)}>
        全履歴をリセット
      </button>

      {showResetDialog && (
        <ResetDialog
          title="学習履歴を全てリセット"
          body={"セッション履歴と苦手な文を全て削除します。\nこの操作は元に戻せません。"}
          onCancel={() => setShowResetDialog(false)}
          onConfirm={handleReset}
        />
      )}
      {categoryToReset && (
        <ResetDialog
          title={`「${categoryToReset}」の履歴をリセット`}
          body={`このカテゴリのセッション履歴と苦手データを削除します。\nこの操作は元に戻せません。`}
          onCancel={() => setCategoryToReset(null)}
          onConfirm={() => handleCategoryReset(categoryToReset)}
        />
      )}
    </>
  );
}

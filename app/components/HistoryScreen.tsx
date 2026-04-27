// app/components/HistoryScreen.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { historyStorage } from '../services/historyStorage';
import type { SessionRecord } from '../services/historyStorage';
import { csvLoader } from '../services/csvLoader';
import type { Sentence } from '../services/csvLoader';

type Tab = 'category' | 'sessions' | 'weak';

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function CategoryTab() {
  const allSentences = csvLoader.getAll();
  const sessions = historyStorage.getSessions();
  const attemptedNos = new Set(sessions.map((s) => s.no));
  const categories = csvLoader.getCategories();

  if (!allSentences.length) {
    return <p className="history-empty">データ読み込み中...</p>;
  }

  const totalAll = allSentences.length;
  const attemptedAll = allSentences.filter((s) => attemptedNos.has(s.no)).length;

  return (
    <>
      <div className="category-summary">
        全 {totalAll} 問 ／ 挑戦済 {attemptedAll} ／ 未挑戦 {totalAll - attemptedAll}
      </div>
      {categories.map((cat) => {
        const catSentences = csvLoader.getByCategory(cat);
        const total = catSentences.length;
        const attempted = catSentences.filter((s) => attemptedNos.has(s.no)).length;
        const pct = total > 0 ? Math.round((attempted / total) * 100) : 0;
        return (
          <div key={cat} className="category-item">
            <div className="category-item-header">
              <span className="category-item-name">{cat}</span>
              <span className="category-item-pct">{pct}%</span>
            </div>
            <div className="progress-bar-wrap">
              <div className="progress-bar" style={{ width: `${pct}%` }} />
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

function WeakTab() {
  const weakMap = historyStorage.getWeakMap();
  const allSentences = csvLoader.getAll();
  const sentenceMap = new Map<number, Sentence>(allSentences.map((s) => [s.no, s]));

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
            <div className="weak-count">{w.mistypeCount} ミス</div>
          </div>
        );
      })}
    </>
  );
}

function ResetDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <p className="modal-title">学習履歴を全てリセット</p>
        <p className="modal-body">
          セッション履歴と苦手な文を全て削除します。<br />
          この操作は元に戻せません。
        </p>
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
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('category');
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const sessions = historyStorage.getSessions();

  function handleReset() {
    historyStorage.clearAll();
    setShowResetDialog(false);
    setResetKey((k) => k + 1);
  }

  return (
    <>
      <div className="history-header">
        <button className="history-back-btn" onClick={() => navigate('/menu')}>
          ← メニューへ戻る
        </button>
        <h2 className="history-title">学習履歴</h2>
      </div>

      <div className="history-tabs">
        {(['category', 'sessions', 'weak'] as Tab[]).map((t) => (
          <button
            key={t}
            className={`history-tab-btn${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'category' ? 'カテゴリ別' : t === 'sessions' ? 'セッション履歴' : '苦手な文'}
          </button>
        ))}
      </div>

      <div className="history-content" key={resetKey}>
        {tab === 'category' && <CategoryTab />}
        {tab === 'sessions' && <SessionsTab sessions={sessions} />}
        {tab === 'weak' && <WeakTab />}
      </div>

      <button className="history-reset-btn" onClick={() => setShowResetDialog(true)}>
        全履歴をリセット
      </button>

      {showResetDialog && (
        <ResetDialog
          onCancel={() => setShowResetDialog(false)}
          onConfirm={handleReset}
        />
      )}
    </>
  );
}

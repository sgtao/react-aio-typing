// app/components/HistoryScreen.tsx
import { useState, useRef } from 'react';
import { historyStorage } from '../services/historyStorage';
import type { SessionRecord } from '../services/historyStorage';
import { csvLoader } from '../services/csvLoader';
import type { Sentence } from '../services/csvLoader';
import { useGameContext } from '../context/GameContext';
import { DonutChart } from './charts/DonutChart';
import { HorizontalBarChart } from './charts/HorizontalBarChart';
import { LineChart } from './charts/LineChart';

type Tab = 'category' | 'sessions' | 'weak';

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
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

function ExportImportPanel({ onImportDone }: { onImportDone: () => void }) {
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    const json = historyStorage.exportAll();
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aio-history-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target!.result as string;
      try {
        let count = 0;
        try {
          const parsed = JSON.parse(text) as { sessions?: unknown[] };
          count = Array.isArray(parsed.sessions) ? parsed.sessions.length : 0;
        } catch { /* leave count as 0 */ }
        historyStorage.importAll(text);
        setMessage({ text: `インポートしました（セッション ${count} 件）`, isError: false });
        onImportDone();
      } catch (err) {
        setMessage({
          text: `インポートに失敗しました: ${err instanceof Error ? err.message : String(err)}`,
          isError: true,
        });
      }
      setTimeout(() => setMessage(null), 3000);
      e.target.value = '';
    };
    reader.readAsText(file);
  }

  return (
    <div className="export-import-panel">
      <button className="export-btn" onClick={handleExport}>エクスポート</button>
      <button className="import-btn" onClick={() => fileInputRef.current?.click()}>インポート</button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleImport}
      />
      {message && (
        <p className={`import-message${message.isError ? ' import-message--error' : ''}`}>
          {message.text}
        </p>
      )}
    </div>
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

  const barItems = categories.map((cat) => {
    const catSentences = csvLoader.getByCategory(cat);
    return {
      label: cat,
      value: catSentences.filter((s) => attemptedNos.has(s.no)).length,
      total: catSentences.length,
    };
  });

  const accuracyData = sessions.slice(0, 30).reverse().map((s) => s.accuracy);

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
        {/* 挑戦数カード */}
        <div
          className={`summary-stat-card summary-stat-card--challenge${activeTab === "sessions" ? " summary-stat-card--active" : ""}`}
          role="button"
          tabIndex={0}
          onClick={() => handleCardClick("sessions")}
          onKeyDown={(e) => e.key === "Enter" && handleCardClick("sessions")}
        >
          <div className="summary-stat-label">挑戦数</div>
          <div className="summary-stat-value">
            {attemptedAll}
            <span className="summary-stat-total"> / {totalAll}</span>
          </div>
          <DonutChart value={attemptedAll} total={totalAll} />
        </div>

        {/* セクション完了カード */}
        <div
          className={`summary-stat-card summary-stat-card--complete${activeTab === "category" ? " summary-stat-card--active" : ""}`}
          role="button"
          tabIndex={0}
          onClick={() => handleCardClick("category")}
          onKeyDown={(e) => e.key === "Enter" && handleCardClick("category")}
        >
          <div className="summary-stat-label">セクション完了</div>
          <div className="summary-stat-value">
            {completedCategories}
            <span className="summary-stat-total"> / {totalCategories}</span>
          </div>
          <HorizontalBarChart items={barItems} />
        </div>

        {/* 正確率カード */}
        <div
          className={`summary-stat-card summary-stat-card--stats${activeTab === "weak" ? " summary-stat-card--active" : ""}`}
          role="button"
          tabIndex={0}
          onClick={() => handleCardClick("weak")}
          onKeyDown={(e) => e.key === "Enter" && handleCardClick("weak")}
        >
          <div className="summary-stat-label">正確率 / 平均 WPM</div>
          <div className="summary-stat-value">
            {avgAccuracy !== null ? `${avgAccuracy}%` : "—"}
          </div>
          {avgWpm !== null && <div className="summary-stat-sub">{avgWpm} WPM</div>}
          <LineChart data={accuracyData} />
        </div>
      </div>

      {activeTab !== null && (
        <div className="history-content" key={resetKey}>
          {activeTab === "category" && (
            <CategoryTab
              onCategoryResetRequest={(cat) => setCategoryToReset(cat)}
              onCategoryStart={startGameWithCategory}
            />
          )}
          {activeTab === "sessions" && <SessionsTab sessions={sessions} />}
          {activeTab === "weak" && <WeakTab sessions={sessions} />}
        </div>
      )}

      <ExportImportPanel onImportDone={() => setResetKey((k) => k + 1)} />

      <button
        className="history-reset-btn"
        onClick={() => setShowResetDialog(true)}
      >
        全履歴をリセット
      </button>

      {showResetDialog && (
        <ResetDialog
          title="学習履歴を全てリセット"
          body={
            "セッション履歴と苦手な文を全て削除します。\nこの操作は元に戻せません。"
          }
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

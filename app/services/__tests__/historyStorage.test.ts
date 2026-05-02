// app/services/__tests__/historyStorage.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { historyStorage } from '../historyStorage';
import type { SessionRecord } from '../historyStorage';

const session: SessionRecord = {
  no: 1,
  category: '01_時制',
  index: '[001]',
  mode: 'typing',
  wpm: 60,
  accuracy: 95,
  elapsed: 30000,
  timestamp: 1714176000000,
};

beforeEach(() => {
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// getSessions
// ---------------------------------------------------------------------------

describe('getSessions', () => {
  it('空の localStorage では [] を返す', () => {
    expect(historyStorage.getSessions()).toEqual([]);
  });

  it('壊れた JSON では [] を返す', () => {
    localStorage.setItem('aio_sessions', 'not-json');
    expect(historyStorage.getSessions()).toEqual([]);
  });

  it('保存済みデータをパースして返す', () => {
    localStorage.setItem('aio_sessions', JSON.stringify([session]));
    expect(historyStorage.getSessions()).toEqual([session]);
  });
});

// ---------------------------------------------------------------------------
// saveSession
// ---------------------------------------------------------------------------

describe('saveSession', () => {
  it('1件保存すると getSessions()[0] で取得できる', () => {
    historyStorage.saveSession(session);
    expect(historyStorage.getSessions()[0]).toEqual(session);
  });

  it('2件目は先頭に追加される（新しい順）', () => {
    const older = { ...session, no: 1, timestamp: 1000 };
    const newer = { ...session, no: 2, timestamp: 2000 };
    historyStorage.saveSession(older);
    historyStorage.saveSession(newer);
    const sessions = historyStorage.getSessions();
    expect(sessions[0]).toEqual(newer);
    expect(sessions[1]).toEqual(older);
  });

  it('201件目を保存しても最大 200 件を維持する', () => {
    for (let i = 0; i < 201; i++) {
      historyStorage.saveSession({ ...session, no: i, timestamp: i });
    }
    expect(historyStorage.getSessions().length).toBe(200);
  });

  it('201件目を保存したとき最初に保存したレコード（no=0）が消える', () => {
    for (let i = 0; i < 201; i++) {
      historyStorage.saveSession({ ...session, no: i, timestamp: i });
    }
    const sessions = historyStorage.getSessions();
    expect(sessions[0].no).toBe(200);
    expect(sessions.some((s) => s.no === 0)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// clearSessions
// ---------------------------------------------------------------------------

describe('clearSessions', () => {
  it('saveSession 後に clearSessions すると getSessions が [] を返す', () => {
    historyStorage.saveSession(session);
    historyStorage.clearSessions();
    expect(historyStorage.getSessions()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getWeakMap
// ---------------------------------------------------------------------------

describe('getWeakMap', () => {
  it('空の localStorage では {} を返す', () => {
    expect(historyStorage.getWeakMap()).toEqual({});
  });

  it('壊れた JSON では {} を返す', () => {
    localStorage.setItem('aio_weak', 'not-json');
    expect(historyStorage.getWeakMap()).toEqual({});
  });

  it('保存済みデータをパースして返す', () => {
    localStorage.setItem('aio_weak', JSON.stringify({ 1: { mistypeCount: 3 } }));
    expect(historyStorage.getWeakMap()).toEqual({ 1: { mistypeCount: 3 } });
  });
});

// ---------------------------------------------------------------------------
// recordMistypes
// ---------------------------------------------------------------------------

describe('recordMistypes', () => {
  it('count が 0 かつ既存エントリなし → 何も変化しない', () => {
    historyStorage.recordMistypes(1, 0);
    expect(historyStorage.getWeakMap()).toEqual({});
  });

  it('count が 0 かつ既存エントリあり → エントリを削除する', () => {
    historyStorage.recordMistypes(1, 3);
    historyStorage.recordMistypes(1, 0);
    expect(historyStorage.getWeakMap()[1]).toBeUndefined();
  });

  it('count が負かつ既存エントリなし → 何も変化しない', () => {
    historyStorage.recordMistypes(1, -1);
    expect(historyStorage.getWeakMap()).toEqual({});
  });

  it('count が負かつ既存エントリあり → エントリを削除する', () => {
    historyStorage.recordMistypes(1, 3);
    historyStorage.recordMistypes(1, -1);
    expect(historyStorage.getWeakMap()[1]).toBeUndefined();
  });

  it('新規 no に count=3 を記録する', () => {
    historyStorage.recordMistypes(1, 3);
    expect(historyStorage.getWeakMap()[1].mistypeCount).toBe(3);
  });

  it('既存 no に count=2 を記録すると count=2 に上書きされる（累積しない）', () => {
    historyStorage.recordMistypes(1, 3);
    historyStorage.recordMistypes(1, 2);
    expect(historyStorage.getWeakMap()[1].mistypeCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// clearWeak
// ---------------------------------------------------------------------------

describe('clearWeak', () => {
  it('recordMistypes 後に clearWeak すると getWeakMap が {} を返す', () => {
    historyStorage.recordMistypes(1, 3);
    historyStorage.clearWeak();
    expect(historyStorage.getWeakMap()).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// clearAll
// ---------------------------------------------------------------------------

describe('clearAll', () => {
  it('saveSession + recordMistypes 後に clearAll すると両方クリアされる', () => {
    historyStorage.saveSession(session);
    historyStorage.recordMistypes(1, 3);
    historyStorage.clearAll();
    expect(historyStorage.getSessions()).toEqual([]);
    expect(historyStorage.getWeakMap()).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// clearByCategory
// ---------------------------------------------------------------------------

describe('clearByCategory', () => {
  it('対象カテゴリのセッションを削除し、他カテゴリのセッションは残す', () => {
    const s1 = { ...session, no: 1, category: '01_時制' };
    const s2 = { ...session, no: 2, category: '02_態' };
    historyStorage.saveSession(s1);
    historyStorage.saveSession(s2);
    historyStorage.clearByCategory('01_時制', [1]);
    const remaining = historyStorage.getSessions();
    expect(remaining.some((s) => s.category === '01_時制')).toBe(false);
    expect(remaining.some((s) => s.category === '02_態')).toBe(true);
  });

  it('対象 nos の weakMap エントリを削除し、他 nos は残す', () => {
    historyStorage.recordMistypes(1, 3);
    historyStorage.recordMistypes(2, 5);
    historyStorage.clearByCategory('01_時制', [1]);
    const map = historyStorage.getWeakMap();
    expect(map[1]).toBeUndefined();
    expect(map[2]).toBeDefined();
  });

  it('sessions と weakMap 両方を同時にクリアする', () => {
    historyStorage.saveSession({ ...session, no: 1, category: '01_時制' });
    historyStorage.recordMistypes(1, 3);
    historyStorage.clearByCategory('01_時制', [1]);
    expect(historyStorage.getSessions()).toEqual([]);
    expect(historyStorage.getWeakMap()).toEqual({});
  });
});

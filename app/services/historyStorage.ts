// app/services/historyStorage.ts

const SESSIONS_KEY = 'aio_sessions';
const WEAK_KEY = 'aio_weak';

export interface SessionRecord {
  no: number;
  category: string;
  index: string;
  mode: 'typing' | 'composition';
  wpm: number;
  accuracy: number;
  elapsed: number;
  timestamp: number;
}

type WeakMap = Record<number, { mistypeCount: number }>;

function getSessions(): SessionRecord[] {
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveSession(s: SessionRecord): void {
  const sessions = getSessions();
  sessions.unshift(s);
  if (sessions.length > 200) sessions.length = 200;
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

function clearSessions(): void {
  localStorage.removeItem(SESSIONS_KEY);
}

function getWeakMap(): WeakMap {
  try {
    return JSON.parse(localStorage.getItem(WEAK_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function recordMistypes(no: number, count: number): void {
  if (count <= 0) return;
  const map = getWeakMap();
  if (!map[no]) map[no] = { mistypeCount: 0 };
  map[no].mistypeCount += count;
  localStorage.setItem(WEAK_KEY, JSON.stringify(map));
}

function clearWeak(): void {
  localStorage.removeItem(WEAK_KEY);
}

function clearAll(): void {
  clearSessions();
  clearWeak();
}

export const historyStorage = {
  getSessions,
  saveSession,
  clearSessions,
  getWeakMap,
  recordMistypes,
  clearWeak,
  clearAll,
};

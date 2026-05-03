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

export interface ExportData {
  version: 1;
  exportedAt: number;
  sessions: SessionRecord[];
  weak: Record<number, { mistypeCount: number }>;
}

type WeakMap = Record<number, { mistypeCount: number }>;

function isExportData(data: unknown): data is ExportData {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    d.version === 1 &&
    typeof d.exportedAt === 'number' &&
    Array.isArray(d.sessions) &&
    typeof d.weak === 'object' &&
    d.weak !== null
  );
}

function isSessionRecord(r: unknown): r is SessionRecord {
  if (typeof r !== 'object' || r === null) return false;
  const s = r as Record<string, unknown>;
  return (
    typeof s.no === 'number' &&
    typeof s.category === 'string' &&
    typeof s.index === 'string' &&
    (s.mode === 'typing' || s.mode === 'composition') &&
    typeof s.timestamp === 'number'
  );
}

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
  const map = getWeakMap();
  if (count <= 0) {
    if (map[no]) {
      delete map[no];
      localStorage.setItem(WEAK_KEY, JSON.stringify(map));
    }
    return;
  }
  map[no] = { mistypeCount: count };
  localStorage.setItem(WEAK_KEY, JSON.stringify(map));
}

function clearWeak(): void {
  localStorage.removeItem(WEAK_KEY);
}

function clearAll(): void {
  clearSessions();
  clearWeak();
}

function exportAll(): string {
  const data: ExportData = {
    version: 1,
    exportedAt: Date.now(),
    sessions: getSessions(),
    weak: getWeakMap(),
  };
  return JSON.stringify(data);
}

function importAll(json: string): void {
  const data = JSON.parse(json) as unknown;
  if (!isExportData(data)) throw new Error('不正なフォーマットです');

  const existing = getSessions();
  const validImported: SessionRecord[] = data.sessions
    .filter(isSessionRecord)
    .map((s) => ({
      ...s,
      wpm: typeof s.wpm === 'number' ? s.wpm : 0,
      accuracy: typeof s.accuracy === 'number' ? s.accuracy : 0,
      elapsed: typeof s.elapsed === 'number' ? s.elapsed : 0,
    }));
  const merged = [...validImported, ...existing];
  merged.sort((a, b) => b.timestamp - a.timestamp);
  if (merged.length > 200) merged.length = 200;
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(merged));

  const weakMap = getWeakMap();
  for (const [key, val] of Object.entries(data.weak)) {
    if (typeof val === 'object' && val !== null && typeof (val as Record<string, unknown>).mistypeCount === 'number') {
      weakMap[Number(key)] = val as { mistypeCount: number };
    }
  }
  localStorage.setItem(WEAK_KEY, JSON.stringify(weakMap));
}

function clearByCategory(category: string, nos: number[]): void {
  const sessions = getSessions().filter((s) => s.category !== category);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));

  const map = getWeakMap();
  const nosSet = new Set(nos);
  for (const no of nosSet) delete map[no];
  localStorage.setItem(WEAK_KEY, JSON.stringify(map));
}

export const historyStorage = {
  getSessions,
  saveSession,
  clearSessions,
  getWeakMap,
  recordMistypes,
  clearWeak,
  clearAll,
  clearByCategory,
  exportAll,
  importAll,
};

import { useState, useCallback } from 'react';

export interface Settings {
  category: string | null;
  order: 'random' | 'sequential';
  mode: 'typing' | 'composition';
  mistypeMode: 'strict' | 'free';
  caseInsensitive: boolean;
  translation: 'slashed' | 'natural';
  hintLevel: 1 | 2 | 3;
}

const STORAGE_KEY = 'aio_settings';

const DEFAULTS: Settings = {
  category: null,
  order: 'random',
  mode: 'typing',
  mistypeMode: 'free',
  caseInsensitive: true,
  translation: 'slashed',
  hintLevel: 1,
};

function loadSettings(): Settings {
  if (typeof window === 'undefined') return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

function persistSettings(settings: Settings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(loadSettings);

  const updateSettings = useCallback((partial: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      persistSettings(next);
      return next;
    });
  }, []);

  return { settings, updateSettings };
}

import { useState, useRef, useEffect, useCallback } from 'react';
import { loadResource, checkFileExist } from '../services/resourceLoader';
import type { ContentItem } from '../services/resourceLoader';
import { TypingEngine, generateHint, buildPendingMask } from '../services/typingEngine';
import type { TypingResults, TypedChar } from '../services/typingEngine';
import type { Settings } from './useSettings';

export type GamePhase = 'menu' | 'playing' | 'result';

export interface GameDisplay {
  phase: GamePhase;
  category: string;
  currentIndex: string;
  targetText: string;
  hintText: string;
  translateText: string;
  translationMode: 'slashed' | 'natural';
  pendingMask: string[] | null;
  typed: TypedChar[];
  enginePosition: number;
  wpm: number;
  accuracy: number;
  elapsed: number;
  results: TypingResults | null;
}

export type { TypedChar };

interface MutableState {
  phase: GamePhase;
  contents: ContentItem[];
  contentsIndex: number[];
  currentIndex: string;
  currentContent: ContentItem | null;
  translationMode: 'slashed' | 'natural';
  engine: TypingEngine | null;
  timerHandle: ReturnType<typeof setInterval> | null;
}

export function useGameState(assetFile: string, settings: Settings) {
  const [display, setDisplay] = useState<GameDisplay>({
    phase: 'menu',
    category: '',
    currentIndex: '',
    targetText: '',
    hintText: '',
    translateText: '',
    translationMode: 'slashed',
    pendingMask: null,
    typed: [],
    enginePosition: 0,
    wpm: 0,
    accuracy: 100,
    elapsed: 0,
    results: null,
  });

  const stateRef = useRef<MutableState>({
    phase: 'menu',
    contents: [],
    contentsIndex: [],
    currentIndex: '',
    currentContent: null,
    translationMode: 'slashed',
    engine: null,
    timerHandle: null,
  });

  const audioMap = useRef<Map<string, HTMLAudioElement>>(new Map());
  const assetFileRef = useRef(assetFile);
  const settingsRef = useRef(settings);
  const startGameFnRef = useRef<() => void>(() => {});

  // Keep settingsRef always current without re-running the effect
  settingsRef.current = settings;

  useEffect(() => {
    const s = stateRef.current;
    const audio = audioMap.current;

    // --- audio helpers ---

    function toggleAudio() {
      const el = audio.get(s.currentIndex);
      if (!el) return;
      if (el.paused || el.ended) {
        if (el.ended) el.currentTime = 0;
        el.play().catch(() => {});
      } else {
        el.pause();
      }
    }

    function stopAudio(indexName: string) {
      const el = audio.get(indexName);
      if (!el) return;
      el.pause();
      el.currentTime = 0;
    }

    function stopAllAudio() {
      audio.forEach((el) => {
        el.pause();
        el.currentTime = 0;
      });
    }

    function playAudioAuto(indexName: string) {
      const el = audio.get(indexName);
      if (!el) return;
      el.currentTime = 0;
      el.play().catch(() => {});
    }

    // --- live stats timer ---

    function startStatsTimer() {
      stopStatsTimer();
      s.timerHandle = setInterval(() => {
        if (!s.engine || s.phase !== 'playing') return;
        const st = s.engine.getDisplayState();
        setDisplay((prev) => ({
          ...prev,
          wpm: st.wpm,
          accuracy: st.accuracy,
          elapsed: st.elapsed,
        }));
      }, 200);
    }

    function stopStatsTimer() {
      if (s.timerHandle !== null) {
        clearInterval(s.timerHandle);
        s.timerHandle = null;
      }
    }

    // --- content helpers ---

    function computeHintText(content: ContentItem): string {
      const cfg = settingsRef.current;
      if (cfg.mode === 'typing') return content.word;
      if (cfg.hintLevel === 1) return content.word;
      if (cfg.hintLevel === 2) return generateHint(content.word);
      return '';
    }

    function computeTranslateText(content: ContentItem, mode: 'slashed' | 'natural'): string {
      return mode === 'natural' ? content.translateNatural : content.translate;
    }

    // --- game state transitions ---

    function gotoMenu() {
      stopAllAudio();
      stopStatsTimer();
      s.phase = 'menu';
      s.engine = null;
      setDisplay((prev) => ({ ...prev, phase: 'menu', results: null }));
    }

    function showResult() {
      if (!s.engine) return;
      stopStatsTimer();
      stopAudio(s.currentIndex);
      const results = s.engine.getResults();
      const st = s.engine.getDisplayState();
      s.phase = 'result';
      setDisplay((prev) => ({
        ...prev,
        phase: 'result',
        typed: st.typed,
        enginePosition: st.position,
        wpm: results.wpm,
        accuracy: results.accuracy,
        elapsed: results.elapsed,
        results,
      }));
    }

    function resetCurrentContent() {
      if (!s.currentContent) return;
      stopAudio(s.currentIndex);
      const cfg = settingsRef.current;
      const engine = new TypingEngine(
        s.currentContent.word,
        cfg.mistypeMode,
        cfg.caseInsensitive
      );
      s.engine = engine;
      s.phase = 'playing';
      const st = engine.getDisplayState();
      startStatsTimer();
      setDisplay((prev) => ({
        ...prev,
        phase: 'playing',
        typed: st.typed,
        enginePosition: st.position,
        wpm: 0,
        accuracy: 100,
        elapsed: 0,
        results: null,
      }));
    }

    function nextContent() {
      if (s.contentsIndex.length === 0) {
        gotoMenu();
        return;
      }

      stopAudio(s.currentIndex);

      const cfg = settingsRef.current;
      const pos = Math.floor(Math.random() * s.contentsIndex.length);
      const idx = s.contentsIndex.splice(pos, 1)[0];
      const content = s.contents[idx];
      const translationMode = cfg.translation;
      const hintText = computeHintText(content);
      const pendingMask =
        cfg.mode === 'composition' ? buildPendingMask(content.word, cfg.hintLevel) : null;
      const translateText = computeTranslateText(content, translationMode);

      const engine = new TypingEngine(content.word, cfg.mistypeMode, cfg.caseInsensitive);
      const st = engine.getDisplayState();

      s.currentIndex = content.index;
      s.currentContent = content;
      s.translationMode = translationMode;
      s.engine = engine;
      s.phase = 'playing';

      setDisplay((prev) => ({
        ...prev,
        phase: 'playing',
        currentIndex: content.index,
        targetText: content.word,
        hintText,
        translateText,
        translationMode,
        pendingMask,
        typed: st.typed,
        enginePosition: st.position,
        wpm: 0,
        accuracy: 100,
        elapsed: 0,
        results: null,
      }));

      startStatsTimer();
      playAudioAuto(content.index);
    }

    async function startGame() {
      const resource = await loadResource(assetFileRef.current);
      s.contents = resource.contents;
      s.contentsIndex = resource.contents.map((_, i) => i);

      audio.forEach((el) => el.pause());
      audio.clear();
      for (const content of resource.contents) {
        const audioName = `${content.index.replace('idx', '')}.mp3`;
        const audioPath = `audio/${audioName}`;
        const exists = await checkFileExist(audioPath);
        if (exists) audio.set(content.index, new Audio(audioPath));
      }

      setDisplay((prev) => ({ ...prev, category: resource.category }));
      setTimeout(() => nextContent(), 50);
    }

    startGameFnRef.current = startGame;

    // --- event handlers ---

    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const phase = s.phase;

      if (phase === 'menu') {
        if (e.key === 'Enter') startGameFnRef.current();
        return;
      }

      if (phase === 'result') {
        if (e.key === 'Enter') { e.preventDefault(); nextContent(); }
        else if (e.key === 'Escape') gotoMenu();
        return;
      }

      // playing
      if (e.key === 'Escape') {
        e.preventDefault();
        resetCurrentContent();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        toggleAudio();
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        const newMode = s.translationMode === 'slashed' ? 'natural' : 'slashed';
        s.translationMode = newMode;
        if (s.currentContent) {
          const translateText = computeTranslateText(s.currentContent, newMode);
          setDisplay((prev) => ({ ...prev, translationMode: newMode, translateText }));
        }
        return;
      }

      if (!s.engine) return;
      e.preventDefault();

      const result = s.engine.handleKey(e.key);
      if (!result || result.ignored) return;
      if (result.blocked) return; // strict mode wrong key — no visual shake for now

      const st = s.engine.getDisplayState();
      setDisplay((prev) => ({
        ...prev,
        typed: st.typed,
        enginePosition: st.position,
      }));

      if (result.complete) showResult();
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      stopStatsTimer();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startGame = useCallback(() => startGameFnRef.current(), []);

  return { display, startGame };
}

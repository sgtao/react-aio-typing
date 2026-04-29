import { useState, useRef, useEffect, useCallback } from 'react';
import { csvLoader } from '../services/csvLoader';
import type { Sentence } from '../services/csvLoader';
import { checkFileExist } from '../services/resourceLoader';
import { TypingEngine, generateHint, buildPendingMask } from '../services/typingEngine';
import type { TypingResults, TypedChar } from '../services/typingEngine';
import type { Settings } from './useSettings';
import { historyStorage } from '../services/historyStorage';

export type GamePhase = 'menu' | 'playing' | 'result';

export interface GameDisplay {
  phase: GamePhase;
  categories: string[];
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
  escWarning: boolean;
  mode: 'typing' | 'composition';
  shiftHintActive: boolean;
  sectionPosition: number;
  sectionTotal: number;
  isAudioPlaying: boolean;
  hasAudio: boolean;
  leftFlash: boolean;
}

export type { TypedChar };

interface ContentItem {
  no: number;
  category: string;
  index: string;
  word: string;
  translate: string;
  translateNatural: string;
}

interface MutableState {
  phase: GamePhase;
  contents: ContentItem[];
  playOrder: number[];
  currentContentIdx: number;
  currentIndex: string;
  currentContent: ContentItem | null;
  translationMode: 'slashed' | 'natural';
  engine: TypingEngine | null;
  timerHandle: ReturnType<typeof setInterval> | null;
  escWarning: boolean;
  escWarningTimer: ReturnType<typeof setTimeout> | null;
  leftFlashTimer: ReturnType<typeof setTimeout> | null;
}


function sentenceToContent(s: Sentence): ContentItem {
  return {
    no: s.no,
    category: s.category,
    index: s.index,
    word: s.englishText,
    translate: s.translationSlashed,
    translateNatural: s.translationNatural,
  };
}

export function useGameState(
  csvPath: string,
  settings: Settings,
  navigate: (to: string) => void,
) {
  const [display, setDisplay] = useState<GameDisplay>({
    phase: 'menu',
    categories: [],
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
    escWarning: false,
    mode: 'typing',
    shiftHintActive: false,
    sectionPosition: 0,
    sectionTotal: 0,
    isAudioPlaying: false,
    hasAudio: false,
    leftFlash: false,
  });

const stateRef = useRef<MutableState>({
  phase: 'menu',
  contents: [],
  playOrder: [],
  currentContentIdx: -1,
  currentIndex: '',
  currentContent: null,
  translationMode: 'slashed',
  engine: null,
  timerHandle: null,
  escWarning: false,
  escWarningTimer: null,
  leftFlashTimer: null,
});

  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const cleanupFnRef = useRef<() => void>(() => {});

  const audioMap = useRef<Map<string, HTMLAudioElement>>(new Map());
  const csvPathRef = useRef(csvPath);
  const settingsRef = useRef(settings);
  const startGameFnRef = useRef<() => void>(() => {});
  const startGameWithCategoryRef = useRef<(cat: string) => void>(() => {});
  const audioListenerCleanupRef = useRef<(() => void) | null>(null);
  const toggleAudioRef = useRef<() => void>(() => {});
  const voiceModeRef = useRef(false);
  const nextContentFnRef = useRef<() => void>(() => {});

  settingsRef.current = settings;

  // Load CSV on mount and populate categories
  useEffect(() => {
    csvLoader.fetchAll(csvPathRef.current)
      .then(() => {
        setDisplay((prev) => ({ ...prev, categories: csvLoader.getCategories() }));
      })
      .catch((err) => {
        console.error('CSV load failed:', err);
      });
  }, []);

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
      audio.forEach((el) => { el.pause(); el.currentTime = 0; });
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
      if (s.escWarningTimer !== null) {
        clearTimeout(s.escWarningTimer);
        s.escWarningTimer = null;
      }
      s.escWarning = false;
      stopAllAudio();
      stopStatsTimer();
      s.phase = 'menu';
      s.engine = null;
      setDisplay((prev) => ({ ...prev, phase: 'menu', results: null, escWarning: false, shiftHintActive: false }));
      navigateRef.current('/menu');
    }

    function showResult() {
      if (!s.engine || !s.currentContent) return;
      stopStatsTimer();
      stopAudio(s.currentIndex);
      const results = s.engine.getResults();
      const st = s.engine.getDisplayState();

      historyStorage.saveSession({
        no:        s.currentContent.no,
        category:  s.currentContent.category,
        index:     s.currentContent.index,
        mode:      settingsRef.current.mode,
        wpm:       results.wpm,
        accuracy:  results.accuracy,
        elapsed:   results.elapsed,
        timestamp: Date.now(),
      });
      if (results.mistypeCount > 0) {
        historyStorage.recordMistypes(s.currentContent.no, results.mistypeCount);
      }

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
        shiftHintActive: false,
      }));
    }

    function resetCurrentContent() {
      if (!s.currentContent) return;
      stopAudio(s.currentIndex);
      const cfg = settingsRef.current;
      const engine = new TypingEngine(s.currentContent.word, cfg.mistypeMode, cfg.caseInsensitive);
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
        shiftHintActive: false,
      }));
    }

    function attachAudioListeners(indexName: string) {
      if (audioListenerCleanupRef.current) {
        audioListenerCleanupRef.current();
        audioListenerCleanupRef.current = null;
      }
      const el = audio.get(indexName);
      if (!el) {
        setDisplay((prev) => ({ ...prev, isAudioPlaying: false }));
        return;
      }
      const onPlay  = () => setDisplay((prev) => ({ ...prev, isAudioPlaying: true }));
      const onPause = () => setDisplay((prev) => ({ ...prev, isAudioPlaying: false }));
      const onEnded = () => setDisplay((prev) => ({ ...prev, isAudioPlaying: false }));
      el.addEventListener('play',  onPlay);
      el.addEventListener('pause', onPause);
      el.addEventListener('ended', onEnded);
      audioListenerCleanupRef.current = () => {
        el.removeEventListener('play',  onPlay);
        el.removeEventListener('pause', onPause);
        el.removeEventListener('ended', onEnded);
      };
      setDisplay((prev) => ({ ...prev, isAudioPlaying: !el.paused && !el.ended }));
    }

    function clearEscWarning() {
      if (!s.escWarning) return;
      if (s.escWarningTimer !== null) {
        clearTimeout(s.escWarningTimer);
        s.escWarningTimer = null;
      }
      s.escWarning = false;
      setDisplay((prev) => ({ ...prev, escWarning: false }));
    }

    function loadContent(pos: number) {
      const contentIdx = s.playOrder[pos];
      const content = s.contents[contentIdx];
      const cfg = settingsRef.current;
      const translationMode = cfg.translation;
      const hintText = computeHintText(content);
      const pendingMask =
        cfg.mode === 'composition' ? buildPendingMask(content.word, cfg.hintLevel) : null;
      const translateText = computeTranslateText(content, translationMode);
      const engine = new TypingEngine(content.word, cfg.mistypeMode, cfg.caseInsensitive);
      const st = engine.getDisplayState();

      stopAudio(s.currentIndex);
      attachAudioListeners(content.index);
      s.currentContentIdx = pos;
      s.currentIndex = content.index;
      s.currentContent = content;
      s.translationMode = translationMode;
      s.engine = engine;
      s.phase = 'playing';

      startStatsTimer();
      playAudioAuto(content.index);

      const contentHasAudio = !!audio.get(content.index);
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
        mode: cfg.mode,
        sectionPosition: pos + 1,
        sectionTotal: s.playOrder.length,
        isAudioPlaying: false,
        hasAudio: contentHasAudio,
        leftFlash: false,
        shiftHintActive: false,
      }));
    }

    function nextContent() {
      const nextPos = s.currentContentIdx + 1;
      if (nextPos >= s.playOrder.length) {
        gotoMenu();
        return;
      }
      loadContent(nextPos);
    }

    async function startGame() {
      const cfg = settingsRef.current;
      if (!cfg.category) return;

      const sentences = csvLoader.getByCategory(cfg.category);
      if (sentences.length === 0) return;
      s.contents = sentences.map(sentenceToContent);

      s.playOrder = s.contents.map((_, i) => i);
      if (cfg.order === 'random') {
        for (let i = s.playOrder.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [s.playOrder[i], s.playOrder[j]] = [s.playOrder[j], s.playOrder[i]];
        }
      }
      s.currentContentIdx = -1;

      audio.forEach((el) => el.pause());
      audio.clear();
      for (const content of s.contents) {
        const audioName = `${content.index.replace(/[\[\]]/g, '')}.mp3`;
        const audioPath = `audio/${audioName}`;
        const exists = await checkFileExist(audioPath);
        if (exists) audio.set(content.index, new Audio(audioPath));
      }

      setDisplay((prev) => ({ ...prev, category: cfg.category! }));
      loadContent(0);
      navigateRef.current('/play');
    }

    startGameFnRef.current = startGame;
    nextContentFnRef.current = nextContent;

    function startGameWithCategory(cat: string) {
      settingsRef.current = { ...settingsRef.current, category: cat };
      startGameFnRef.current();
    }
    startGameWithCategoryRef.current = startGameWithCategory;

    toggleAudioRef.current = toggleAudio;

    cleanupFnRef.current = () => {
      stopAllAudio();
      stopStatsTimer();
      if (audioListenerCleanupRef.current) {
        audioListenerCleanupRef.current();
        audioListenerCleanupRef.current = null;
      }
    };

    // --- event handlers ---
    function triggerFlash() {
      if (s.leftFlashTimer !== null) clearTimeout(s.leftFlashTimer);
      setDisplay((prev) => ({ ...prev, leftFlash: true }));
      s.leftFlashTimer = setTimeout(() => {
        s.leftFlashTimer = null;
        setDisplay((prev) => ({ ...prev, leftFlash: false }));
      }, 500);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (voiceModeRef.current && s.phase === 'playing') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const phase = s.phase;

      if (phase === 'menu') {
        if (e.key === 'Enter' && settingsRef.current.category) startGameFnRef.current();
        return;
      }

      if (phase === 'result') {
        if (e.key === 'Enter') { e.preventDefault(); nextContent(); }
        else if (e.key === 'Escape') gotoMenu();
        else if (e.key === 'Tab') {
          e.preventDefault();
          const newMode = s.translationMode === 'slashed' ? 'natural' : 'slashed';
          s.translationMode = newMode;
          if (s.currentContent) {
            const translateText = computeTranslateText(s.currentContent, newMode);
            setDisplay((prev) => ({ ...prev, translationMode: newMode, translateText }));
          }
        }
        return;
      }

      // playing
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        clearEscWarning();
        const st = s.engine ? s.engine.getDisplayState() : null;
        const typedManual = st ? st.typed.filter((c) => !c.auto).length : 0;
        if (typedManual > 0) {
          resetCurrentContent();
        } else if (s.currentContentIdx > 0) {
          loadContent(s.currentContentIdx - 1);
        } else {
          triggerFlash();
        }
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        clearEscWarning();
        if (s.currentContentIdx < s.playOrder.length - 1) {
          loadContent(s.currentContentIdx + 1);
        } else {
          triggerFlash();
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        const st = s.engine ? s.engine.getDisplayState() : null;
        const typedLen = st ? st.typed.filter((c) => !c.auto).length : 0;
        if (typedLen === 0) {
          gotoMenu();
        } else if (s.escWarning) {
          gotoMenu();
        } else {
          s.escWarning = true;
          resetCurrentContent();
          setDisplay((prev) => ({ ...prev, escWarning: true }));
          s.escWarningTimer = setTimeout(() => {
            s.escWarning = false;
            s.escWarningTimer = null;
            setDisplay((prev) => ({ ...prev, escWarning: false }));
          }, 3000);
        }
        return;
      }
      if (e.key === 'Enter') { e.preventDefault(); toggleAudio(); return; }
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
      if (e.key === 'Shift' && !e.repeat && settingsRef.current.mode === 'composition') {
        setDisplay((prev) => ({ ...prev, shiftHintActive: true }));
        return;
      }

      if (s.escWarning) {
        if (s.escWarningTimer !== null) {
          clearTimeout(s.escWarningTimer);
          if (s.leftFlashTimer !== null) {
            clearTimeout(s.leftFlashTimer);
            s.leftFlashTimer = null;
          }
          s.escWarningTimer = null;
        }
        s.escWarning = false;
        setDisplay((prev) => ({ ...prev, escWarning: false }));
      }

      if (!s.engine) return;
      e.preventDefault();

      const result = s.engine.handleKey(e.key);
      if (!result || result.ignored) return;
      if (result.blocked) return;

      const st = s.engine.getDisplayState();
      setDisplay((prev) => ({ ...prev, typed: st.typed, enginePosition: st.position }));

      if (result.complete) showResult();
    }

    function handleKeyUp(e: KeyboardEvent) {
      if (e.key === 'Shift') {
        setDisplay((prev) => ({ ...prev, shiftHintActive: false }));
      }
    }

    function handleBlur() {
      setDisplay((prev) => ({ ...prev, shiftHintActive: false }));
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      stopStatsTimer();
      if (s.escWarningTimer !== null) {
        clearTimeout(s.escWarningTimer);
        s.escWarningTimer = null;
      }
      if (s.leftFlashTimer !== null) {
        clearTimeout(s.leftFlashTimer);
        s.leftFlashTimer = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startGame = useCallback(() => startGameFnRef.current(), []);
  const cleanup = useCallback(() => cleanupFnRef.current(), []);
  const toggleAudio = useCallback(() => toggleAudioRef.current(), []);
  const startGameWithCategory = useCallback((cat: string) => startGameWithCategoryRef.current(cat), []);
  const goToNextContent = useCallback(() => nextContentFnRef.current(), []);
  const setVoiceMode = useCallback((active: boolean) => { voiceModeRef.current = active; }, []);

  return { display, startGame, startGameWithCategory, cleanup, toggleAudio, goToNextContent, setVoiceMode };
}

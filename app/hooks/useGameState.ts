import { useState, useRef, useEffect } from 'react';
import { loadResource, checkFileExist } from '../services/resourceLoader';
import type { ContentItem } from '../services/resourceLoader';

export type GamePhase = 'menu' | 'playing' | 'complete';

export interface GameDisplay {
  phase: GamePhase;
  category: string;
  currentIndex: string;
  displayWord: string;
  translate: string;
  elapsedTime: string;
}

interface MutableState {
  phase: GamePhase;
  contents: ContentItem[];
  contentsIndex: number[];
  word: string;
  wordUpper: string;
  wordLower: string;
  loc: number;
  startTime: number;
  currentIndex: string;
}

export function useGameState(assetFile: string) {
  const [display, setDisplay] = useState<GameDisplay>({
    phase: 'menu',
    category: '',
    currentIndex: '',
    displayWord: '',
    translate: '',
    elapsedTime: '',
  });

  const stateRef = useRef<MutableState>({
    phase: 'menu',
    contents: [],
    contentsIndex: [],
    word: '',
    wordUpper: '',
    wordLower: '',
    loc: 0,
    startTime: 0,
    currentIndex: '',
  });

  // Map<contentIndex, HTMLAudioElement>
  const audioMap = useRef<Map<string, HTMLAudioElement>>(new Map());

  // assetFile is stable so capture it once via ref for effect closure
  const assetFileRef = useRef(assetFile);

  useEffect(() => {
    const s = stateRef.current;
    const audio = audioMap.current;

    // --- pure helpers ---

    function findTypingChar() {
      if (s.loc >= s.word.length - 1) return;
      while (!/[0-9A-Za-z]/.test(s.word[s.loc]) && s.loc < s.word.length - 1) {
        s.loc += 1;
      }
    }

    function isWordComplete(): boolean {
      if (s.loc >= s.word.length) return true;
      if (s.loc === s.word.length - 1 && !/[0-9A-Za-z]/.test(s.word[s.loc])) return true;
      return false;
    }

    // --- audio helpers ---

    function playAudio(indexName: string) {
      const el = audio.get(indexName);
      if (!el) return;
      el.currentTime = 0;
      el.play().catch(() => {});
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

    // --- game state transitions ---

    function gotoMenu() {
      stopAllAudio();
      s.phase = 'menu';
      setDisplay((prev) => ({ ...prev, phase: 'menu' }));
    }

    function showFinishContent() {
      stopAudio(s.currentIndex);
      const elapsed = ((Date.now() - s.startTime) / 1000).toFixed(2);
      s.phase = 'complete';
      setDisplay((prev) => ({
        ...prev,
        phase: 'complete',
        elapsedTime: `Finished! ${elapsed} seconds!`,
      }));
    }

    function nextContent() {
      if (s.contentsIndex.length === 0) {
        gotoMenu();
        return;
      }

      stopAudio(s.currentIndex);

      const pos = Math.floor(Math.random() * s.contentsIndex.length);
      const idx = s.contentsIndex.splice(pos, 1)[0];
      const content = s.contents[idx];

      s.word = content.word;
      s.wordUpper = content.word.toUpperCase();
      s.wordLower = content.word.toLowerCase();
      s.loc = 0;
      findTypingChar();
      s.startTime = Date.now();
      s.currentIndex = content.index;
      s.phase = 'playing';

      setDisplay((prev) => ({
        ...prev,
        currentIndex: content.index,
        translate: content.translate,
        displayWord: content.word,
        elapsedTime: '',
        phase: 'playing',
      }));

      playAudio(content.index);
    }

    async function startGame() {
      const resource = await loadResource(assetFileRef.current);
      s.contents = resource.contents;
      s.contentsIndex = resource.contents.map((_, i) => i);

      // Load audio files
      audio.forEach((el) => el.pause());
      audio.clear();
      for (const content of resource.contents) {
        const audioName = `${content.index.replace('idx', '')}.mp3`;
        const audioPath = `audio/${audioName}`;
        const exists = await checkFileExist(audioPath);
        if (exists) {
          audio.set(content.index, new Audio(audioPath));
        }
      }

      setDisplay((prev) => ({ ...prev, category: resource.category }));

      // Small delay so display update settles before first word
      setTimeout(() => nextContent(), 50);
    }

    // --- event handlers ---

    function handleKeyDown(e: KeyboardEvent) {
      const phase = s.phase;

      if (phase === 'menu') {
        if (e.key === 'Enter') startGame();
        return;
      }

      if (phase === 'complete') {
        if (e.key === 'Enter') nextContent();
        return;
      }

      // playing
      if (e.key === 'Escape') {
        stopAllAudio();
        gotoMenu();
        return;
      }
      if (e.key === 'Enter') {
        showFinishContent();
        return;
      }
      if (e.key === ' ') {
        e.preventDefault();
        playAudio(s.currentIndex);
        return;
      }

      if (e.key !== s.wordUpper[s.loc] && e.key !== s.wordLower[s.loc]) return;

      // Correct key: replace character with '_' and advance
      const loc = s.loc;
      const word = s.word;
      const before = loc === 0 ? '' : word.substring(0, loc);
      const after = loc === word.length - 1 ? '' : word.substring(loc + 1);
      const newWord = `${before}_${after}`;

      s.word = newWord;
      s.loc = loc < newWord.length - 1 ? loc + 1 : loc;
      findTypingChar();

      setDisplay((prev) => ({ ...prev, displayWord: newWord }));

      if (isWordComplete()) showFinishContent();
    }

    function handleClick() {
      if (s.phase === 'menu') startGame();
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClick);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { display };
}

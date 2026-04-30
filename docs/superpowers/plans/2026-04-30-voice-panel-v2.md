# Voice Panel v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** VoicePanel をポップアップモーダルに刷新し、複数回録音のトランスクリプト累積・15秒タイマー・単語レベル部分一致ハイライト表示を実装する。

**Architecture:** `useSpeechInput` hook に `accumulatedText`・`recordingProgress`・`partialMatchResult`・タイマーロジックを追加する。`PlayingScreen` の `VoicePanel` をモーダルオーバーレイ型 `VoiceModal` コンポーネントに置き換える。`play.tsx` で `voiceProps` を新 API に更新し、`game.css` にモーダル・単語ハイライト用スタイルを追加する。

**Tech Stack:** Web Speech API、React hooks、TypeScript、Vitest

---

## ファイル変更一覧

| ファイル | 種別 | 内容 |
|---|---|---|
| `app/hooks/useSpeechInput.ts` | 変更 | WordMatch 型・computeWordMatches・累積テキスト・タイマー追加 |
| `app/hooks/__tests__/useSpeechInput.test.ts` | 変更 | computeWordMatches テスト追加 |
| `app/components/PlayingScreen.tsx` | 変更 | VoicePanel をモーダル型に刷新、VoiceProps 更新 |
| `app/routes/play.tsx` | 変更 | voiceProps を新 API に更新 |
| `app/styles/game.css` | 変更 | モーダル・単語ハイライト・プログレスバー CSS 追加、旧スタイル削除 |

---

### Task 1: WordMatch 型と computeWordMatches 関数を TDD で追加

**Files:**
- Modify: `app/hooks/__tests__/useSpeechInput.test.ts`
- Modify: `app/hooks/useSpeechInput.ts`

- [ ] **Step 1: テストを追加（失敗確認）**

`app/hooks/__tests__/useSpeechInput.test.ts` を以下に置き換え：

```ts
import { describe, it, expect } from 'vitest';
import { normalize, computeWordMatches } from '../useSpeechInput';

describe('normalize', () => {
  it('lowercases and strips non-alphanumeric', () => {
    expect(normalize("He said, 'Hello!'")).toBe('hesaidhello');
  });
  it('handles empty string', () => {
    expect(normalize('')).toBe('');
  });
  it('preserves numbers', () => {
    expect(normalize('Room 101!')).toBe('room101');
  });
  it('strips spaces', () => {
    expect(normalize('hello world')).toBe('helloworld');
  });
});

describe('computeWordMatches', () => {
  it('matches words case-insensitively ignoring punctuation', () => {
    const result = computeWordMatches("there is a crack", "There's a small crack");
    expect(result).toEqual([
      { word: "There's", matched: false },
      { word: 'a', matched: true },
      { word: 'small', matched: false },
      { word: 'crack', matched: true },
    ]);
  });
  it('returns all matched when transcript equals target words', () => {
    const result = computeWordMatches("hello world", "Hello world");
    expect(result).toEqual([
      { word: 'Hello', matched: true },
      { word: 'world', matched: true },
    ]);
  });
  it('returns all unmatched for empty accumulated text', () => {
    const result = computeWordMatches("", "Hello world");
    expect(result).toEqual([
      { word: 'Hello', matched: false },
      { word: 'world', matched: false },
    ]);
  });
  it('handles empty target text', () => {
    const result = computeWordMatches("hello", "");
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx vitest run app/hooks/__tests__/useSpeechInput.test.ts
```

Expected: FAIL（`computeWordMatches` is not exported from `useSpeechInput`）

- [ ] **Step 3: `WordMatch` 型と `computeWordMatches` を `useSpeechInput.ts` に追加**

`app/hooks/useSpeechInput.ts` の `normalize` 関数の直後（line 17 の後）に以下を追加：

```ts
export interface WordMatch {
  word: string;
  matched: boolean;
}

export function computeWordMatches(accumulatedText: string, targetText: string): WordMatch[] {
  const targetWords = targetText.split(/\s+/).filter(Boolean);
  const accumulatedNormSet = new Set(
    accumulatedText
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.replace(/[^a-z0-9]/g, ''))
      .filter(Boolean)
  );
  return targetWords.map((word) => ({
    word,
    matched: accumulatedNormSet.has(word.toLowerCase().replace(/[^a-z0-9]/g, '')),
  }));
}
```

- [ ] **Step 4: テストが通ることを確認**

```bash
npx vitest run app/hooks/__tests__/useSpeechInput.test.ts
```

Expected: PASS（8 tests）

- [ ] **Step 5: コミット**

```bash
git add app/hooks/__tests__/useSpeechInput.test.ts app/hooks/useSpeechInput.ts
git commit -m "feat: add WordMatch type and computeWordMatches helper (TDD)"
```

---

### Task 2: `useSpeechInput` hook を全面更新

**Files:**
- Modify: `app/hooks/useSpeechInput.ts`

**注意:** このタスク完了後 `play.tsx` で TypeScript エラーが発生する（旧 API を参照しているため）。Task 3 で解消する。

- [ ] **Step 1: `app/hooks/useSpeechInput.ts` を以下に全置き換え**

```ts
import { useState, useRef, useEffect } from 'react';

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: SpeechRecognitionResultList }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export interface WordMatch {
  word: string;
  matched: boolean;
}

export function computeWordMatches(accumulatedText: string, targetText: string): WordMatch[] {
  const targetWords = targetText.split(/\s+/).filter(Boolean);
  const accumulatedNormSet = new Set(
    accumulatedText
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.replace(/[^a-z0-9]/g, ''))
      .filter(Boolean)
  );
  return targetWords.map((word) => ({
    word,
    matched: accumulatedNormSet.has(word.toLowerCase().replace(/[^a-z0-9]/g, '')),
  }));
}

const MAX_RECORDING_MS = 15_000;
const TIMER_INTERVAL_MS = 100;

export interface UseSpeechInputReturn {
  isVoiceMode: boolean;
  isRecording: boolean;
  transcript: string;
  accumulatedText: string;
  recordingProgress: number;
  partialMatchResult: WordMatch[] | null;
  toggleVoiceMode: () => void;
  startRecording: () => void;
  stopRecording: () => void;
  appendTranscript: () => void;
  setAccumulatedText: React.Dispatch<React.SetStateAction<string>>;
  judgePartial: (targetText: string) => void;
  reset: () => void;
  isSpeechSupported: boolean;
}

export function useSpeechInput(): UseSpeechInputReturn {
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [accumulatedText, setAccumulatedText] = useState('');
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [partialMatchResult, setPartialMatchResult] = useState<WordMatch[] | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef(0);

  const isSpeechSupported =
    typeof window !== 'undefined' &&
    (typeof (window as any).SpeechRecognition !== 'undefined' ||
      typeof (window as any).webkitSpeechRecognition !== 'undefined');

  useEffect(() => {
    const SR =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR() as SpeechRecognitionLike;
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (e: { results: SpeechRecognitionResultList }) => {
      const text = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join('');
      setTranscript(text);
    };
    recognition.onend = () => {
      setIsRecording(false);
      clearTimer();
      setRecordingProgress(0);
      progressRef.current = 0;
    };
    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, []);

  function clearTimer() {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function startRecording() {
    if (!recognitionRef.current) return;
    setTranscript('');
    setPartialMatchResult(null);
    setIsRecording(true);
    progressRef.current = 100;
    setRecordingProgress(100);
    timerRef.current = setInterval(() => {
      progressRef.current -= (TIMER_INTERVAL_MS / MAX_RECORDING_MS) * 100;
      if (progressRef.current <= 0) {
        progressRef.current = 0;
        setRecordingProgress(0);
        clearTimer();
        recognitionRef.current?.stop();
      } else {
        setRecordingProgress(progressRef.current);
      }
    }, TIMER_INTERVAL_MS);
    recognitionRef.current.start();
  }

  function stopRecording() {
    clearTimer();
    setRecordingProgress(0);
    progressRef.current = 0;
    recognitionRef.current?.stop();
  }

  function appendTranscript() {
    if (!transcript) return;
    setAccumulatedText((prev) => (prev ? prev + ' ' + transcript : transcript));
    setTranscript('');
  }

  function judgePartial(targetText: string) {
    setPartialMatchResult(computeWordMatches(accumulatedText, targetText));
  }

  function reset() {
    setTranscript('');
    setAccumulatedText('');
    setPartialMatchResult(null);
    setRecordingProgress(0);
    progressRef.current = 0;
  }

  function toggleVoiceMode() {
    reset();
    setIsVoiceMode((prev) => !prev);
  }

  return {
    isVoiceMode,
    isRecording,
    transcript,
    accumulatedText,
    recordingProgress,
    partialMatchResult,
    toggleVoiceMode,
    startRecording,
    stopRecording,
    appendTranscript,
    setAccumulatedText,
    judgePartial,
    reset,
    isSpeechSupported,
  };
}
```

- [ ] **Step 2: テストが通ることを確認**

```bash
npx vitest run app/hooks/__tests__/useSpeechInput.test.ts
```

Expected: PASS（8 tests）

- [ ] **Step 3: コミット（typecheck はスキップ — play.tsx が旧 API を使っているためエラーになる）**

```bash
git add app/hooks/useSpeechInput.ts
git commit -m "feat: add accumulated text, timer, and word-level judgment to useSpeechInput"
```

---

### Task 3: `play.tsx` の voiceProps と `PlayingScreen.tsx` の VoiceProps・VoiceModal を更新

**Files:**
- Modify: `app/routes/play.tsx`
- Modify: `app/components/PlayingScreen.tsx`

- [ ] **Step 1: `app/routes/play.tsx` を以下に全置き換え**

```tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useGameContext } from '../context/GameContext';
import { PlayingScreen } from '../components/PlayingScreen';
import { ResultScreen } from '../components/ResultScreen';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { SectionHeader } from '../components/SectionHeader';
import { useSpeechInput } from '../hooks/useSpeechInput';

export default function Play() {
  const { display, cleanup, toggleAudio, goToNextContent, setVoiceMode } = useGameContext();
  const navigate = useNavigate();

  const {
    isVoiceMode,
    isRecording,
    transcript,
    accumulatedText,
    recordingProgress,
    partialMatchResult,
    toggleVoiceMode,
    startRecording,
    stopRecording,
    appendTranscript,
    setAccumulatedText,
    judgePartial,
    reset,
    isSpeechSupported,
  } = useSpeechInput();

  useEffect(() => {
    if (display.category === '') {
      navigate('/menu', { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  useEffect(() => {
    setVoiceMode(isVoiceMode);
  }, [isVoiceMode, setVoiceMode]);

  const voiceProps = {
    isVoiceMode,
    isRecording,
    transcript,
    accumulatedText,
    recordingProgress,
    partialMatchResult,
    onToggleVoiceMode: toggleVoiceMode,
    onStartRecording: startRecording,
    onStopRecording: stopRecording,
    onAppendTranscript: appendTranscript,
    onSetAccumulatedText: setAccumulatedText,
    onJudgePartial: () => judgePartial(display.targetText),
    onReset: reset,
    onNext: () => { goToNextContent(); toggleVoiceMode(); },
    isSpeechSupported,
  };

  const content = (() => {
    if (display.phase === 'playing') return <PlayingScreen display={display} toggleAudio={toggleAudio} voice={voiceProps} />;
    if (display.phase === 'result') return <ResultScreen display={display} />;
    return null;
  })();

  return (
    <ProtectedRoute>
      {display.leftFlash && <div className="boundary-flash" />}
      <SectionHeader
        category={display.category}
        currentIndex={display.currentIndex}
        sectionPosition={display.sectionPosition}
        sectionTotal={display.sectionTotal}
      />
      {content}
    </ProtectedRoute>
  );
}
```

- [ ] **Step 2: `app/components/PlayingScreen.tsx` を以下に全置き換え**

```tsx
import type { Dispatch, SetStateAction } from 'react';
import { LiveStats } from './LiveStats';
import type { GameDisplay } from '../hooks/useGameState';
import type { WordMatch } from '../hooks/useSpeechInput';

interface VoiceProps {
  isVoiceMode: boolean;
  isRecording: boolean;
  transcript: string;
  accumulatedText: string;
  recordingProgress: number;
  partialMatchResult: WordMatch[] | null;
  onToggleVoiceMode: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onAppendTranscript: () => void;
  onSetAccumulatedText: Dispatch<SetStateAction<string>>;
  onJudgePartial: () => void;
  onReset: () => void;
  onNext: () => void;
  isSpeechSupported: boolean;
}

interface Props {
  display: GameDisplay;
  toggleAudio: () => void;
  voice: VoiceProps;
}

function TypingDisplay({ display }: { display: GameDisplay }) {
  const { typed, enginePosition, targetText, pendingMask } = display;

  return (
    <p className="target-word">
      {targetText.split('').map((ch, i) => {
        if (i < typed.length) {
          const t = typed[i];
          if (t.auto) return <span key={i} className="char-auto">{ch}</span>;
          return (
            <span key={i} className={t.correct ? 'char-correct' : 'char-wrong'}>
              {ch}
            </span>
          );
        }
        const displayChar = pendingMask ? pendingMask[i] : ch;
        if (i === enginePosition) {
          return <span key={i} className="char-cursor">{displayChar}</span>;
        }
        return <span key={i} className="char-pending">{displayChar}</span>;
      })}
    </p>
  );
}

function VoiceModal({ voice }: { voice: VoiceProps }) {
  const {
    isRecording, transcript, accumulatedText, recordingProgress, partialMatchResult,
    onStartRecording, onStopRecording, onAppendTranscript, onSetAccumulatedText,
    onJudgePartial, onReset, onNext, onToggleVoiceMode,
  } = voice;

  const remainingSeconds = ((recordingProgress / 100) * 15).toFixed(1);

  function handleClose() {
    if (isRecording) onStopRecording();
    onToggleVoiceMode();
  }

  return (
    <div className="voice-modal-overlay" onClick={handleClose}>
      <div className="voice-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="voice-modal-header">
          <span className="voice-modal-title">🎤 音声入力</span>
          <button className="voice-modal-close-btn" onClick={handleClose}>✕</button>
        </div>

        <div className="voice-modal-section">
          <button
            className={`voice-record-btn${isRecording ? ' voice-record-btn--recording' : ''}`}
            onClick={isRecording ? onStopRecording : onStartRecording}
          >
            {isRecording ? '■ 停止' : '● 録音する'}
          </button>

          {isRecording && (
            <div className="voice-progress-wrap">
              <div className="voice-progress-bar" style={{ width: `${recordingProgress}%` }} />
              <span className="voice-progress-time">{remainingSeconds}s</span>
            </div>
          )}

          {transcript && (
            <div className="voice-current-transcript">
              <span>今回：「{transcript}」</span>
              <button className="voice-append-btn" onClick={onAppendTranscript}>+ 反映</button>
            </div>
          )}
        </div>

        <div className="voice-modal-section">
          <label className="voice-accumulated-label">判定用テキスト</label>
          <textarea
            className="voice-accumulated-textarea"
            value={accumulatedText}
            onChange={(e) => onSetAccumulatedText(e.target.value)}
            rows={3}
          />
          <button
            className="voice-judge-btn"
            onClick={onJudgePartial}
            disabled={!accumulatedText.trim()}
          >
            判定する
          </button>
        </div>

        {partialMatchResult !== null && (
          <div className="voice-modal-section">
            <div className="voice-word-result">
              {partialMatchResult.map((wm, i) => (
                <span
                  key={i}
                  className={`voice-word${wm.matched ? ' voice-word--matched' : ' voice-word--unmatched'}`}
                >
                  {wm.word}
                </span>
              ))}
            </div>
            <div className="voice-actions">
              <button className="voice-retry-btn" onClick={onReset}>もう一度</button>
              <button className="voice-next-btn" onClick={onNext}>次へ →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function VoicePanel({ voice }: { voice: VoiceProps }) {
  const { isVoiceMode, isSpeechSupported, onToggleVoiceMode } = voice;

  return (
    <div className="voice-section">
      {isSpeechSupported && (
        <button
          className={`voice-toggle-btn${isVoiceMode ? ' voice-toggle-btn--active' : ''}`}
          onClick={onToggleVoiceMode}
        >
          🎤 音声入力
        </button>
      )}
      {isVoiceMode && <VoiceModal voice={voice} />}
    </div>
  );
}

export function PlayingScreen({ display, toggleAudio, voice }: Props) {
  const {
    hintText, targetText, translateText, translationMode,
    escWarning, mode, shiftHintActive, wpm, accuracy, elapsed, isAudioPlaying, hasAudio,
  } = display;

  const displayedHint = shiftHintActive ? targetText : hintText;

  return (
    <>
      <p className="instruction">
        {mode === 'composition'
          ? 'Enter=音声再生・停止／Tab=訳切替／Esc=リセット(未入力でメニュー)／Shift=全文表示／←→=前後移動'
          : 'Enter=音声再生・停止／Tab=訳切替／Esc=リセット(未入力でメニュー)／←→=前後移動'}
      </p>

      <p className="hint-text">
        <span className="translate-label">
          {translationMode === 'slashed' ? 'スラッシュ訳' : '自然な訳'}：
        </span>
        {translateText}
      </p>

      {displayedHint && <p className="translate-text">{displayedHint}</p>}

      {escWarning && (
        <p className="esc-warning">もう一度 ESC を押すとメニューに戻ります</p>
      )}

      <TypingDisplay display={display} />

      <LiveStats wpm={wpm} accuracy={accuracy} elapsed={elapsed} />

      {hasAudio && (
        <button className="audio-btn" onClick={toggleAudio}>
          <span className="audio-icon">{isAudioPlaying ? '⏸' : '▶'}</span>
          {isAudioPlaying ? 'Stop ( Enter )' : 'Start ( Enter )'}
        </button>
      )}

      {mode === 'composition' && <VoicePanel voice={voice} />}
    </>
  );
}
```

- [ ] **Step 3: 型チェック**

```bash
npm run typecheck
```

Expected: 0 errors

- [ ] **Step 4: テスト**

```bash
npx vitest run
```

Expected: all PASS（8 tests in useSpeechInput, plus existing tests）

- [ ] **Step 5: コミット**

```bash
git add app/routes/play.tsx app/components/PlayingScreen.tsx
git commit -m "feat: replace VoicePanel with VoiceModal (popup, accumulated text, word-level judgment)"
```

---

### Task 4: CSS の更新（モーダル・単語ハイライト・プログレスバー追加、旧スタイル削除）

**Files:**
- Modify: `app/styles/game.css`

- [ ] **Step 1: 旧スタイルを削除**

`app/styles/game.css` から以下のブロックを削除する（line 840〜847、866〜872、890〜902 付近）：

削除対象1 — `.voice-panel` ブロック:
```css
.voice-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  max-width: 480px;
}
```

削除対象2 — `.voice-transcript` ブロック:
```css
.voice-transcript {
  font-size: 0.95rem;
  color: #444;
  font-style: italic;
  text-align: center;
  margin: 0;
}
```

削除対象3 — `.voice-result`・`.voice-result--match`・`.voice-result--mismatch` の3ブロック:
```css
.voice-result {
  font-size: 1.1rem;
  font-weight: bold;
  margin: 0;
}

.voice-result--match {
  color: #27ae60;
}

.voice-result--mismatch {
  color: #e74c3c;
}
```

- [ ] **Step 2: 新スタイルをファイル末尾に追加**

`app/styles/game.css` の末尾に以下を追加：

```css
/* --- Voice Modal --- */
.voice-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.voice-modal-dialog {
  background: #fff;
  border-radius: 12px;
  padding: 1.5rem;
  width: min(90vw, 480px);
  display: flex;
  flex-direction: column;
  gap: 0;
  max-height: 90vh;
  overflow-y: auto;
}

.voice-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.voice-modal-title {
  font-size: 1.1rem;
  font-weight: bold;
}

.voice-modal-close-btn {
  background: transparent;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: #666;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  line-height: 1;
}

.voice-modal-close-btn:hover {
  background: #f0f0f0;
}

.voice-modal-section {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  border-top: 1px solid #eee;
  padding: 0.75rem 0;
}

/* Progress bar */
.voice-progress-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.voice-progress-bar {
  flex: 1;
  height: 8px;
  background: #4a90d9;
  border-radius: 4px;
  transition: width 0.1s linear;
  min-width: 0;
}

.voice-progress-time {
  font-size: 0.8rem;
  color: #666;
  white-space: nowrap;
  min-width: 3ch;
  text-align: right;
}

/* Current transcript row */
.voice-current-transcript {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  font-style: italic;
  color: #444;
  font-size: 0.9rem;
}

.voice-append-btn {
  padding: 0.3rem 0.75rem;
  border: 1px solid #4a90d9;
  border-radius: 6px;
  background: #fff;
  color: #4a90d9;
  cursor: pointer;
  font-size: 0.85rem;
  white-space: nowrap;
  flex-shrink: 0;
}

/* Accumulated textarea */
.voice-accumulated-label {
  font-size: 0.85rem;
  color: #666;
  font-weight: bold;
}

.voice-accumulated-textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 0.95rem;
  resize: vertical;
  box-sizing: border-box;
  font-family: inherit;
}

/* Word-level result */
.voice-word-result {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  line-height: 1.6;
}

.voice-word {
  font-size: 1rem;
}

.voice-word--matched {
  color: #27ae60;
}

.voice-word--unmatched {
  color: #e74c3c;
}
```

- [ ] **Step 3: 型チェックとテスト**

```bash
npm run typecheck && npx vitest run
```

Expected: 0 errors, all tests PASS

- [ ] **Step 4: コミット**

```bash
git add app/styles/game.css
git commit -m "style: add voice modal CSS, remove obsolete inline voice panel styles"
```

---

## ブラウザ確認チェックリスト

- [ ] composition モードで 🎤 音声入力ボタンが表示される
- [ ] タイピングモードでは非表示
- [ ] ボタン押下でモーダルが中央にオーバーレイ表示される
- [ ] 「録音する」クリックで録音開始、プログレスバーが右から左に縮む
- [ ] 15 秒で録音が自動停止する
- [ ] 「停止」クリックで手動停止できる
- [ ] トランスクリプトが「今回：「...」」に表示される
- [ ] 「+ 反映」で累積 textarea に追記される
- [ ] textarea を手動編集できる
- [ ] 複数回録音して累積できる
- [ ] 「判定する」で単語ごとに緑／赤ハイライト表示される
- [ ] 「もう一度」で累積テキストと結果がリセットされる（モーダルは開いたまま）
- [ ] 「次へ →」でモーダルが閉じて次の文に進む
- [ ] ✕ ボタン / オーバーレイクリックでモーダルが閉じる
- [ ] 音声モード中はキーボード入力がブロックされる（タイピング不可）

## テストコマンド

```bash
npm run typecheck
npx vitest run
```

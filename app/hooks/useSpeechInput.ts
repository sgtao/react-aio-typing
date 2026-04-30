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
      clearTimer();
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
    clearTimer();
    recognitionRef.current?.stop();
    setIsRecording(false);
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

import { useState, useRef, useEffect } from 'react';

// SpeechRecognition is not in TypeScript's DOM lib, so we define a minimal interface
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

export interface UseSpeechInputReturn {
  isVoiceMode: boolean;
  isRecording: boolean;
  transcript: string;
  matchResult: 'match' | 'mismatch' | null;
  toggleVoiceMode: () => void;
  startRecording: () => void;
  stopRecording: () => void;
  judge: (targetText: string) => void;
  reset: () => void;
  isSpeechSupported: boolean;
}

export function useSpeechInput(): UseSpeechInputReturn {
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [matchResult, setMatchResult] = useState<'match' | 'mismatch' | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

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
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, []);

  function reset() {
    setTranscript('');
    setMatchResult(null);
  }

  function toggleVoiceMode() {
    reset();
    setIsVoiceMode((prev) => !prev);
  }

  function startRecording() {
    if (!recognitionRef.current) return;
    setTranscript('');
    setMatchResult(null);
    setIsRecording(true);
    recognitionRef.current.start();
  }

  function stopRecording() {
    recognitionRef.current?.stop();
  }

  function judge(targetText: string) {
    const isMatch = normalize(transcript) === normalize(targetText);
    setMatchResult(isMatch ? 'match' : 'mismatch');
  }

  return {
    isVoiceMode,
    isRecording,
    transcript,
    matchResult,
    toggleVoiceMode,
    startRecording,
    stopRecording,
    judge,
    reset,
    isSpeechSupported,
  };
}

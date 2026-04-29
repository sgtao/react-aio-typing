import { useState, useRef, useEffect } from 'react';

export function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
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
  const recognitionRef = useRef<any>(null);

  const isSpeechSupported =
    typeof window !== 'undefined' &&
    (typeof (window as any).SpeechRecognition !== 'undefined' ||
      typeof (window as any).webkitSpeechRecognition !== 'undefined');

  useEffect(() => {
    const SR =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (e: Event) => {
      const event = e as any;
      const text = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join('');
      setTranscript(text);
    };
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition as any;
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

import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useGameContext } from '../context/GameContext';
import { PlayingScreen } from '../components/PlayingScreen';
import { ResultScreen } from '../components/ResultScreen';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { SectionHeader } from '../components/SectionHeader';
import { useSpeechInput } from '../hooks/useSpeechInput';

export default function Play() {
  const {
    display,
    cleanup,
    toggleAudio,
    goToNextContent,
    goToPrevContent,
    goToNextNav,
    handleEscape,
    toggleTranslation,
    toggleShiftHint,
    setVoiceMode,
    saveVoiceResult,
  } = useGameContext();
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
    onRegister: (accuracy: number, mistypeCount: number) => {
      saveVoiceResult(accuracy, mistypeCount);
      goToNextContent();
      toggleVoiceMode();
    },
    isSpeechSupported,
  };

  const content = (() => {
    if (display.phase === 'playing')
      return (
        <PlayingScreen
          display={display}
          toggleAudio={toggleAudio}
          voice={voiceProps}
          onPrev={goToPrevContent}
          onNext={goToNextNav}
          onEsc={handleEscape}
          onTab={toggleTranslation}
          onShiftToggle={toggleShiftHint}
        />
      );
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

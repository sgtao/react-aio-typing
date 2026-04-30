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
  onRegister: (accuracy: number, mistypeCount: number) => void;
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

interface VoiceModalDisplayProps {
  translateText: string;
  translationMode: 'slashed' | 'natural';
  displayedHint: string;
}

function VoiceModal({ voice, displayProps }: { voice: VoiceProps; displayProps: VoiceModalDisplayProps }) {
  const {
    isRecording, transcript, accumulatedText, recordingProgress, partialMatchResult,
    onStartRecording, onStopRecording, onAppendTranscript, onSetAccumulatedText,
    onJudgePartial, onReset, onRegister, onToggleVoiceMode,
  } = voice;
  const { translateText, translationMode, displayedHint } = displayProps;

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

        <div className="voice-modal-section voice-modal-context">
          <p className="hint-text voice-modal-hint">
            <span className="translate-label">
              {translationMode === 'slashed' ? 'スラッシュ訳' : '自然な訳'}：
            </span>
            {translateText}
          </p>
          {displayedHint && <p className="translate-text">{displayedHint}</p>}
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
              <div className="voice-progress-track">
                <div className="voice-progress-bar" style={{ width: `${recordingProgress}%` }} />
              </div>
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
          <label className="voice-accumulated-label" htmlFor="voice-accumulated">判定用テキスト</label>
          <textarea
            id="voice-accumulated"
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
              <button
                className="voice-next-btn"
                onClick={() => {
                  const matched = partialMatchResult!.filter((w) => w.matched).length;
                  const total = partialMatchResult!.length;
                  const accuracy = total > 0 ? Math.round((matched / total) * 100) : 100;
                  const mistypeCount = total - matched;
                  onRegister(accuracy, mistypeCount);
                }}
              >
                登録
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function VoicePanel({ voice, displayProps }: { voice: VoiceProps; displayProps: VoiceModalDisplayProps }) {
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
      {isVoiceMode && <VoiceModal voice={voice} displayProps={displayProps} />}
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

      {mode === 'composition' && (
        <VoicePanel
          voice={voice}
          displayProps={{ translateText, translationMode, displayedHint }}
        />
      )}
    </>
  );
}

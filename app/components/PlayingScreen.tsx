import { LiveStats } from './LiveStats';
import type { GameDisplay } from '../hooks/useGameState';

interface VoiceProps {
  isVoiceMode: boolean;
  isRecording: boolean;
  transcript: string;
  matchResult: 'match' | 'mismatch' | null;
  onToggleVoiceMode: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onJudge: () => void;
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

function VoicePanel({ voice, targetText }: { voice: VoiceProps; targetText: string }) {
  const {
    isVoiceMode, isRecording, transcript, matchResult,
    onToggleVoiceMode, onStartRecording, onStopRecording, onJudge, onReset, onNext,
    isSpeechSupported,
  } = voice;

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

      {isVoiceMode && (
        <div className="voice-panel">
          <button
            className={`voice-record-btn${isRecording ? ' voice-record-btn--recording' : ''}`}
            onMouseDown={onStartRecording}
            onMouseUp={onStopRecording}
            onMouseLeave={onStopRecording}
          >
            {isRecording ? '● 録音中...' : '● 録音する'}
          </button>

          {transcript && (
            <p className="voice-transcript">トランスクリプト：「{transcript}」</p>
          )}

          <button
            className="voice-judge-btn"
            onClick={onJudge}
            disabled={!transcript}
          >
            判定する
          </button>

          {matchResult !== null && (
            <>
              <p className={`voice-result voice-result--${matchResult}`}>
                {matchResult === 'match' ? '✅ 正解！' : '❌ 不一致'}
              </p>
              <div className="voice-actions">
                <button className="voice-retry-btn" onClick={onReset}>もう一度</button>
                <button className="voice-next-btn" onClick={onNext}>次へ →</button>
              </div>
            </>
          )}
        </div>
      )}
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
        <VoicePanel voice={voice} targetText={targetText} />
      )}
    </>
  );
}

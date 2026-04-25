import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useGameContext } from '../context/GameContext';
import { PlayingScreen } from '../components/PlayingScreen';
import { ResultScreen } from '../components/ResultScreen';

export default function Play() {
  const { display, cleanup } = useGameContext();
  const navigate = useNavigate();

  useEffect(() => {
    // display.category が空の場合はゲーム未開始のため / にリダイレクト
    if (display.category === '') {
      navigate('/', { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  if (display.phase === 'playing') return <PlayingScreen display={display} />;
  if (display.phase === 'result') return <ResultScreen display={display} />;
  return null;
}

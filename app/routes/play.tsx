import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useGameContext } from '../context/GameContext';
import { PlayingScreen } from '../components/PlayingScreen';
import { ResultScreen } from '../components/ResultScreen';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { SectionHeader } from '../components/SectionHeader';

export default function Play() {
  const { display, cleanup, toggleAudio } = useGameContext();
  const navigate = useNavigate();

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

  const content = (() => {
    if (display.phase === 'playing') return <PlayingScreen display={display} toggleAudio={toggleAudio} />;
    if (display.phase === 'result') return <ResultScreen display={display} />;
    return null;
  })();

  return (
    <ProtectedRoute>
      <SectionHeader
        category={display.category}
        currentIndex={display.currentIndex}
        sectionPosition={display.sectionPosition}
        sectionTotal={display.sectionTotal}
        leftFlash={display.leftFlash}
      />
      {content}
    </ProtectedRoute>
  );
}

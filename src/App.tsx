import { useMemo, useState } from 'react';
import { questions } from './data/questions';
import {
  buildQuizOrder,
  countReviewable,
  isCorrect,
  listCategories,
  modeLabel,
  selectQuestions,
  summarize,
  type QuizMode,
} from './lib/quiz';
import { loadProgress, recordAnswer, resetProgress, saveProgress } from './lib/storage';
import { HomeScreen } from './components/HomeScreen';
import { QuestionCard } from './components/QuestionCard';
import { ResultView } from './components/ResultView';
import type { Question } from './types/question';

type Screen = 'home' | 'quiz' | 'result';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [mode, setMode] = useState<QuizMode>({ kind: 'all' });
  const [order, setOrder] = useState<Question[]>([]);
  const [cursor, setCursor] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [progress, setProgress] = useState(() => loadProgress());

  const reviewCount = useMemo(
    () => countReviewable(questions, progress.wrongIds),
    [progress.wrongIds],
  );
  const categories = useMemo(
    () => listCategories(questions, progress.wrongIds),
    [progress.wrongIds],
  );
  const sessionSummary = useMemo(
    () => summarize(order.length, sessionCorrect),
    [order.length, sessionCorrect],
  );

  function startQuiz(next: QuizMode) {
    const selected = selectQuestions(questions, next, progress.wrongIds);
    // 復習対象が空になった直後などは出題できないのでホームに戻す
    if (selected.length === 0) {
      setScreen('home');
      return;
    }
    setMode(next);
    setOrder(buildQuizOrder(selected));
    setCursor(0);
    setSelectedIndex(null);
    setSessionCorrect(0);
    setScreen('quiz');
  }

  function handleSelect(index: number) {
    if (selectedIndex !== null) return;
    const current = order[cursor];
    setSelectedIndex(index);
    const correct = isCorrect(current, index);
    if (correct) setSessionCorrect((n) => n + 1);
    const next = recordAnswer(progress, current.id, correct);
    setProgress(next);
    saveProgress(next);
  }

  function handleNext() {
    if (cursor + 1 >= order.length) {
      setScreen('result');
      return;
    }
    setCursor((c) => c + 1);
    setSelectedIndex(null);
  }

  function handleResetProgress() {
    setProgress(resetProgress());
  }

  return (
    <main className="app">
      <header className="app__header">
        <h1 className="app__title">TOEIC 文法トレーナー</h1>
        {screen === 'quiz' && (
          <button type="button" className="btn btn--ghost" onClick={() => setScreen('home')}>
            中断
          </button>
        )}
      </header>

      {screen === 'home' && (
        <HomeScreen
          totalQuestions={questions.length}
          reviewCount={reviewCount}
          categories={categories}
          progress={progress}
          onStart={startQuiz}
          onResetProgress={handleResetProgress}
        />
      )}

      {screen === 'quiz' && order[cursor] && (
        <>
          <p className="app__mode">{modeLabel(mode)}</p>
          <QuestionCard
            question={order[cursor]}
            index={cursor}
            total={order.length}
            selectedIndex={selectedIndex}
            onSelect={handleSelect}
            onNext={handleNext}
          />
        </>
      )}

      {screen === 'result' && (
        <ResultView
          modeName={modeLabel(mode)}
          session={sessionSummary}
          lifetime={progress}
          reviewCount={reviewCount}
          onRetry={() => startQuiz(mode)}
          onReview={() => startQuiz({ kind: 'review' })}
          onHome={() => setScreen('home')}
        />
      )}
    </main>
  );
}

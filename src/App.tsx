import { useEffect, useMemo, useState } from 'react';
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
import {
  CONFIDENCES,
  loadProgress,
  recordAnswer,
  resetProgress,
  saveProgress,
  type Confidence,
} from './lib/storage';
import { clearSession, loadSession, saveSession } from './lib/session';
import { HomeScreen } from './components/HomeScreen';
import { QuestionCard } from './components/QuestionCard';
import { ResultView } from './components/ResultView';
import type { Question } from './types/question';

type Screen = 'home' | 'quiz' | 'result';

export default function App() {
  // マウント時に一度だけ読む。解きかけのセッションがあればその状態から始める
  const [restored] = useState(() => loadSession(questions));
  const [screen, setScreen] = useState<Screen>(restored?.onQuiz ? 'quiz' : 'home');
  const [mode, setMode] = useState<QuizMode>(restored?.mode ?? { kind: 'all' });
  const [order, setOrder] = useState<Question[]>(restored?.order ?? []);
  const [cursor, setCursor] = useState(restored?.cursor ?? 0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(
    restored?.selectedIndex ?? null,
  );
  const [confidence, setConfidence] = useState<Confidence | null>(restored?.confidence ?? null);
  const [sessionCorrect, setSessionCorrect] = useState(restored?.sessionCorrect ?? 0);
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

  // 自信度の申告は毎問はさまるので、1〜3 キーでも選べるようにする
  const awaitingConfidence = screen === 'quiz' && selectedIndex !== null && confidence === null;
  useEffect(() => {
    if (!awaitingConfidence) return;
    function onKeyDown(e: KeyboardEvent) {
      const i = Number(e.key) - 1;
      if (i >= 0 && i < CONFIDENCES.length) {
        e.preventDefault();
        handleConfidence(CONFIDENCES[i]);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // handleConfidence は progress / selectedIndex に依存するため毎回張り直す
  });

  // 解きかけの状態を毎回書き出しておき、タブを閉じても続きから戻れるようにする。
  // 結果画面まで到達したセッションは用済みなので消す。
  useEffect(() => {
    if (screen === 'result' || order.length === 0) {
      if (screen === 'result') clearSession();
      return;
    }
    saveSession({
      mode,
      orderIds: order.map((q) => q.id),
      cursor,
      selectedIndex,
      confidence,
      sessionCorrect,
      // クイズ画面で離れたなら次回はそのまま再開、中断でホームに戻ったなら「続きから」で待つ
      onQuiz: screen === 'quiz',
    });
  }, [screen, mode, order, cursor, selectedIndex, confidence, sessionCorrect]);

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
    setConfidence(null);
    setSessionCorrect(0);
    setScreen('quiz');
  }

  function handleSelect(index: number) {
    if (selectedIndex !== null) return;
    setSelectedIndex(index);
  }

  /** 自信度が決まって初めて正誤を確定し、進捗に記録する。 */
  function handleConfidence(next: Confidence) {
    if (selectedIndex === null || confidence !== null) return;
    const current = order[cursor];
    const correct = isCorrect(current, selectedIndex);
    setConfidence(next);
    if (correct) setSessionCorrect((n) => n + 1);
    const updated = recordAnswer(progress, current.id, correct, next);
    setProgress(updated);
    saveProgress(updated);
  }

  function handleNext() {
    if (cursor + 1 >= order.length) {
      setScreen('result');
      return;
    }
    setCursor((c) => c + 1);
    setSelectedIndex(null);
    setConfidence(null);
  }

  function handleResetProgress() {
    setProgress(resetProgress());
  }

  /** 結果を見終えたセッションは捨てる。order を空にすると「続きから」も消える。 */
  function handleFinishToHome() {
    setOrder([]);
    setCursor(0);
    setSelectedIndex(null);
    setConfidence(null);
    setSessionCorrect(0);
    setScreen('home');
  }

  // ホームに戻っていて、まだ解き終えていないセッションが残っている状態
  const suspended =
    screen === 'home' && order.length > 0
      ? { modeName: modeLabel(mode), cursor, total: order.length }
      : null;

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
          suspended={suspended}
          onResume={() => setScreen('quiz')}
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
            confidence={confidence}
            onSelect={handleSelect}
            onConfidence={handleConfidence}
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
          onHome={handleFinishToHome}
        />
      )}
    </main>
  );
}

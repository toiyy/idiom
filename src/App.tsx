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
import { countCorrect, emptyAnswers, setAnswer, type Answers } from './lib/answers';
import { loadNotes, saveNotes, setNote, type Notes } from './lib/notes';
import {
  addRecord,
  loadRecords,
  removeRecord,
  saveRecords,
  takeRecord,
  type StudyRecord,
} from './lib/records';
import type { Backup } from './lib/backup';
import { HomeScreen } from './components/HomeScreen';
import { GuideView } from './components/GuideView';
import { findGuide } from './data/guides';
import { targetKey } from './types/guide';
import { QuestionCard } from './components/QuestionCard';
import { ResultView } from './components/ResultView';
import type { Question } from './types/question';

type Screen = 'home' | 'quiz' | 'result' | 'guide';

export default function App() {
  // マウント時に一度だけ読む。解きかけのセッションがあればその状態から始める
  const [restored] = useState(() => loadSession(questions));
  const [screen, setScreen] = useState<Screen>(restored?.onQuiz ? 'quiz' : 'home');
  const [mode, setMode] = useState<QuizMode>(restored?.mode ?? { kind: 'all' });
  const [order, setOrder] = useState<Question[]>(restored?.order ?? []);
  const [cursor, setCursor] = useState(restored?.cursor ?? 0);
  // 前の問題に戻れるよう、現在の 1 問ぶんではなく出題順ぶんまとめて持つ
  const [answers, setAnswers] = useState<Answers>(restored?.answers ?? []);
  const [progress, setProgress] = useState(() => loadProgress());

  const current = answers[cursor] ?? null;
  const selectedIndex = current?.selectedIndex ?? null;
  const confidence = current?.confidence ?? null;
  const sessionCorrect = useMemo(() => countCorrect(order, answers), [order, answers]);
  const [notes, setNotes] = useState<Notes>(() => loadNotes());
  const [records, setRecords] = useState<StudyRecord[]>(() => loadRecords());
  // 表示中の解説を開いた出題単位。解説は読み物なのでセッションには保存しない
  const [guideOf, setGuideOf] = useState<{ category: string; subcategory?: string } | null>(null);

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
    if (screen === 'result' || screen === 'guide' || order.length === 0) {
      if (screen === 'result') clearSession();
      return;
    }
    saveSession({
      mode,
      orderIds: order.map((q) => q.id),
      cursor,
      answers,
      // クイズ画面で離れたなら次回はそのまま再開、中断でホームに戻ったなら「続きから」で待つ
      onQuiz: screen === 'quiz',
    });
  }, [screen, mode, order, cursor, answers]);

  function startQuiz(next: QuizMode) {
    const selected = selectQuestions(questions, next, progress.wrongIds);
    // 復習対象が空になった直後などは出題できないのでホームに戻す
    if (selected.length === 0) {
      setScreen('home');
      return;
    }
    const nextOrder = buildQuizOrder(selected);
    setMode(next);
    setOrder(nextOrder);
    setCursor(0);
    setAnswers(emptyAnswers(nextOrder.length));
    setScreen('quiz');
  }

  function handleSelect(index: number) {
    // 解答済みの問題に戻ってきたときは選び直せない。進捗を二重に記録しないため
    if (current !== null) return;
    setAnswers(setAnswer(answers, cursor, { selectedIndex: index, confidence: null }));
  }

  /** 自信度が決まって初めて正誤を確定し、進捗に記録する。 */
  function handleConfidence(next: Confidence) {
    if (current === null || current.confidence !== null) return;
    const question = order[cursor];
    const correct = isCorrect(question, current.selectedIndex);
    setAnswers(setAnswer(answers, cursor, { ...current, confidence: next }));
    const updated = recordAnswer(progress, question.id, correct, next);
    setProgress(updated);
    saveProgress(updated);
  }

  function handleNext() {
    if (cursor + 1 >= order.length) {
      setScreen('result');
      return;
    }
    setCursor((c) => c + 1);
  }

  /** 直前の問題を見返す。解答済みの状態のまま表示され、進捗は動かない。 */
  function handlePrev() {
    setCursor((c) => Math.max(0, c - 1));
  }

  function handleResetProgress() {
    setProgress(resetProgress());
  }

  /** 別端末から書き出したデータで置き換える。解きかけのセッションはそのまま残す。 */
  function handleImportBackup(next: Backup) {
    setProgress(next.progress);
    saveProgress(next.progress);
    setNotes(next.notes);
    saveNotes(next.notes);
    setRecords(next.records);
    saveRecords(next.records);
  }

  /**
   * ここまでを 1 件として残す。保存するのはその時点の累計で、
   * 表示するときに前の記録との差を取るので「前回からやったぶん」が 1 件になる。
   */
  function handleTakeRecord() {
    const next = addRecord(records, takeRecord(progress, reviewCount));
    setRecords(next);
    saveRecords(next);
  }

  function handleDeleteRecord(takenAt: string) {
    const next = removeRecord(records, takenAt);
    setRecords(next);
    saveRecords(next);
  }

  /** メモは打つそばから保存する。保存ボタンを挟むとスマホで書き捨てになりやすい。 */
  function handleNoteChange(questionId: string, text: string) {
    const next = setNote(notes, questionId, text);
    setNotes(next);
    saveNotes(next);
  }

  /** 結果を見終えたセッションは捨てる。order を空にすると「続きから」も消える。 */
  function handleFinishToHome() {
    setOrder([]);
    setCursor(0);
    setAnswers([]);
    setScreen('home');
  }

  const guide = guideOf === null ? undefined : findGuide(guideOf.category, guideOf.subcategory);

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
          onImportBackup={handleImportBackup}
          notes={notes}
          pool={questions}
          onDeleteNote={(id) => handleNoteChange(id, '')}
          records={records}
          onTakeRecord={handleTakeRecord}
          onDeleteRecord={handleDeleteRecord}
          onOpenGuide={(of) => {
            setGuideOf(of);
            setScreen('guide');
          }}
        />
      )}

      {screen === 'guide' && guide && (
        <GuideView
          guide={guide}
          targets={guide.targets.map((t) => ({
            label: targetKey(t),
            count: questions.filter(
              (q) =>
                q.category === t.category &&
                (t.subcategory === undefined || q.subcategory === t.subcategory),
            ).length,
            onStart: () =>
              startQuiz(
                t.subcategory === undefined
                  ? { kind: 'category', category: t.category }
                  : { kind: 'subcategory', category: t.category, subcategory: t.subcategory },
              ),
          }))}
          onBack={() => setScreen('home')}
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
            onPrev={handlePrev}
            note={notes[order[cursor].id] ?? ''}
            onNoteChange={(text) => handleNoteChange(order[cursor].id, text)}
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

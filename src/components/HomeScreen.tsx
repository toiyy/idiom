import type { CategorySummary, QuizMode } from '../lib/quiz';
import type { Progress } from '../lib/storage';

interface HomeScreenProps {
  totalQuestions: number;
  reviewCount: number;
  categories: CategorySummary[];
  progress: Progress;
  onStart: (mode: QuizMode) => void;
  onResetProgress: () => void;
}

export function HomeScreen({
  totalQuestions,
  reviewCount,
  categories,
  progress,
  onStart,
  onResetProgress,
}: HomeScreenProps) {
  const accuracy = progress.answered === 0 ? 0 : progress.correct / progress.answered;

  return (
    <>
      <section className="card">
        <h2 className="section__title">モードを選ぶ</h2>

        <div className="mode-list">
          <button type="button" className="mode" onClick={() => onStart({ kind: 'all' })}>
            <span className="mode__name">全問</span>
            <span className="mode__count">{totalQuestions} 問</span>
          </button>

          <button
            type="button"
            className="mode"
            disabled={reviewCount === 0}
            onClick={() => onStart({ kind: 'review' })}
          >
            <span className="mode__name">復習</span>
            <span className="mode__count">
              {reviewCount === 0 ? '間違えた問題なし' : `${reviewCount} 問`}
            </span>
          </button>
        </div>
      </section>

      <section className="card">
        <h2 className="section__title">カテゴリ別</h2>
        <div className="category-list">
          {categories.map((c) => (
            <button
              key={c.category}
              type="button"
              className="category"
              onClick={() => onStart({ kind: 'category', category: c.category })}
            >
              <span className="category__name">{c.category}</span>
              <span className="category__count">
                {c.total} 問
                {c.wrong > 0 && <span className="category__wrong"> / 要復習 {c.wrong}</span>}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="section__title">累計</h2>
        <p className="result__score">
          {progress.correct} / {progress.answered}
          <span className="result__pct">（{Math.round(accuracy * 100)}%）</span>
        </p>
        <button type="button" className="btn btn--ghost" onClick={onResetProgress}>
          累計と復習リストをリセット
        </button>
      </section>
    </>
  );
}

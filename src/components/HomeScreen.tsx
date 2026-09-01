import type { CategorySummary, QuizMode } from '../lib/quiz';
import type { Progress } from '../lib/storage';
import { ConfidenceTable } from './ConfidenceTable';

interface HomeScreenProps {
  totalQuestions: number;
  reviewCount: number;
  categories: CategorySummary[];
  progress: Progress;
  /** 中断して残っているセッション。なければ null。 */
  suspended: { modeName: string; cursor: number; total: number } | null;
  onResume: () => void;
  onStart: (mode: QuizMode) => void;
  onResetProgress: () => void;
}

/** 「12 問 / 要復習 3」のような件数表示。カテゴリとサブカテゴリで共用する。 */
function Count({ total, wrong }: { total: number; wrong: number }) {
  return (
    <span className="category__count">
      {total} 問{wrong > 0 && <span className="category__wrong"> / 要復習 {wrong}</span>}
    </span>
  );
}

export function HomeScreen({
  totalQuestions,
  reviewCount,
  categories,
  progress,
  suspended,
  onResume,
  onStart,
  onResetProgress,
}: HomeScreenProps) {
  const accuracy = progress.answered === 0 ? 0 : progress.correct / progress.answered;
  const flat = categories.filter((c) => c.subcategories.length === 0);
  const nested = categories.filter((c) => c.subcategories.length > 0);

  return (
    <>
      {suspended && (
        <section className="card card--resume">
          <h2 className="section__title">続きから</h2>
          <button type="button" className="mode mode--resume" onClick={onResume}>
            <span className="mode__name">{suspended.modeName}</span>
            <span className="mode__count">
              {suspended.cursor + 1} / {suspended.total} 問
            </span>
          </button>
        </section>
      )}

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

        {/* サブカテゴリを持たないカテゴリはグリッドにフラットに並べる */}
        <div className="category-list">
          {flat.map((c) => (
            <button
              key={c.category}
              type="button"
              className="category"
              onClick={() => onStart({ kind: 'category', category: c.category })}
            >
              <span className="category__name">{c.category}</span>
              <Count total={c.total} wrong={c.wrong} />
            </button>
          ))}
        </div>

        {/* サブカテゴリを持つカテゴリは、見出し + サブカテゴリの 2 段で出す */}
        {nested.map((c) => (
          <div className="category-group" key={c.category}>
            <button
              type="button"
              className="category-group__head"
              onClick={() => onStart({ kind: 'category', category: c.category })}
            >
              <span className="category-group__name">{c.category}</span>
              <span className="category-group__all">すべて</span>
              <Count total={c.total} wrong={c.wrong} />
            </button>
            <div className="category-list">
              {c.subcategories.map((s) => (
                <button
                  key={s.subcategory}
                  type="button"
                  className="category"
                  onClick={() =>
                    onStart({
                      kind: 'subcategory',
                      category: c.category,
                      subcategory: s.subcategory,
                    })
                  }
                >
                  <span className="category__name">{s.subcategory}</span>
                  <Count total={s.total} wrong={s.wrong} />
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="card">
        <h2 className="section__title">累計</h2>
        <p className="result__score">
          {progress.correct} / {progress.answered}
          <span className="result__pct">（{Math.round(accuracy * 100)}%）</span>
        </p>
        <ConfidenceTable progress={progress} />
        <button type="button" className="btn btn--ghost" onClick={onResetProgress}>
          累計と復習リストをリセット
        </button>
      </section>
    </>
  );
}

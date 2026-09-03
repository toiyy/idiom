import type { CategorySummary, QuizMode } from '../lib/quiz';
import type { Progress } from '../lib/storage';
import { ConfidenceTable } from './ConfidenceTable';
import { ProgressTransfer } from './ProgressTransfer';
import { NoteList } from './NoteList';
import type { Notes } from '../lib/notes';
import type { Backup } from '../lib/backup';
import { findGuide } from '../data/guides';
import type { Question } from '../types/question';

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
  onImportBackup: (next: Backup) => void;
  notes: Notes;
  pool: readonly Question[];
  onDeleteNote: (questionId: string) => void;
  onOpenGuide: (of: { category: string; subcategory?: string }) => void;
}

/** 「12 問」のような件数表示。カテゴリとサブカテゴリで共用する。 */
function Count({ total }: { total: number }) {
  return <span className="category__count">{total} 問</span>;
}

/**
 * そのカテゴリの要復習だけを解くボタン。要復習がなければ出さない。
 * 件数はここに出すので、カテゴリ名の横には総数だけを添える。
 */
function ReviewButton({
  name,
  wrong,
  onStart,
}: {
  name: string;
  wrong: number;
  onStart: () => void;
}) {
  if (wrong === 0) return null;
  return (
    <button
      type="button"
      className="category__review"
      aria-label={`要復習（${name}）`}
      onClick={onStart}
    >
      要復習 {wrong}
    </button>
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
  onImportBackup,
  notes,
  pool,
  onDeleteNote,
  onOpenGuide,
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
            // 解説ボタンを入れ子にできないので、カテゴリと横並びの兄弟にする
            <div className="category-item" key={c.category}>
              <button
                type="button"
                className="category"
                onClick={() => onStart({ kind: 'category', category: c.category })}
              >
                <span className="category__name">{c.category}</span>
                <Count total={c.total} />
              </button>
              <ReviewButton
                name={c.category}
                wrong={c.wrong}
                onStart={() => onStart({ kind: 'category', category: c.category, review: true })}
              />
              {findGuide(c.category) && (
                <button
                  type="button"
                  className="category__guide"
                  aria-label={`解説（${c.category}）`}
                  onClick={() => onOpenGuide({ category: c.category })}
                >
                  解説
                </button>
              )}
            </div>
          ))}
        </div>

        {/* サブカテゴリを持つカテゴリは、見出し + サブカテゴリの 2 段で出す */}
        {nested.map((c) => (
          <div className="category-group" key={c.category}>
            <div className="category-group__bar">
              <button
                type="button"
                className="category-group__head"
                onClick={() => onStart({ kind: 'category', category: c.category })}
              >
                <span className="category-group__name">{c.category}</span>
                <span className="category-group__all">すべて</span>
                <Count total={c.total} />
              </button>
              <ReviewButton
                name={c.category}
                wrong={c.wrong}
                onStart={() => onStart({ kind: 'category', category: c.category, review: true })}
              />
              {findGuide(c.category) && (
                <button
                  type="button"
                  className="category__guide"
                  aria-label={`解説（${c.category}）`}
                  onClick={() => onOpenGuide({ category: c.category })}
                >
                  解説
                </button>
              )}
            </div>
            <div className="category-list">
              {c.subcategories.map((s) => (
                <div className="category-item" key={s.subcategory}>
                  <button
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
                    <Count total={s.total} />
                  </button>
                  <ReviewButton
                    name={s.subcategory}
                    wrong={s.wrong}
                    onStart={() =>
                      onStart({
                        kind: 'subcategory',
                        category: c.category,
                        subcategory: s.subcategory,
                        review: true,
                      })
                    }
                  />
                  {/* カテゴリ全体の解説しかない場合は、サブカテゴリ側には出さない */}
                  {findGuide(c.category, s.subcategory) !== findGuide(c.category) && (
                    <button
                      type="button"
                      className="category__guide"
                      aria-label={`解説（${s.subcategory}）`}
                      onClick={() =>
                        onOpenGuide({ category: c.category, subcategory: s.subcategory })
                      }
                    >
                      解説
                    </button>
                  )}
                </div>
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

      <NoteList notes={notes} pool={pool} onDelete={onDeleteNote} />

      <ProgressTransfer backup={{ progress, notes }} onImport={onImportBackup} />
    </>
  );
}

import type { ScoreSummary } from '../lib/quiz';
import type { Progress } from '../lib/storage';

interface ResultViewProps {
  modeName: string;
  session: ScoreSummary;
  lifetime: Progress;
  reviewCount: number;
  onRetry: () => void;
  onReview: () => void;
  onHome: () => void;
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export function ResultView({
  modeName,
  session,
  lifetime,
  reviewCount,
  onRetry,
  onReview,
  onHome,
}: ResultViewProps) {
  const lifetimeAccuracy = lifetime.answered === 0 ? 0 : lifetime.correct / lifetime.answered;

  return (
    <section className="card">
      <h2 className="section__title">{modeName} の結果</h2>
      <p className="result__score">
        {session.correct} / {session.total}
        <span className="result__pct">（{pct(session.accuracy)}）</span>
      </p>

      <dl className="result__stats">
        <div>
          <dt>累計</dt>
          <dd>
            {lifetime.correct} / {lifetime.answered}（{pct(lifetimeAccuracy)}）
          </dd>
        </div>
        <div>
          <dt>要復習</dt>
          <dd>{reviewCount} 問</dd>
        </div>
      </dl>

      <div className="result__actions">
        <button type="button" className="btn btn--primary" onClick={onRetry}>
          もう一度
        </button>
        <button type="button" className="btn" disabled={reviewCount === 0} onClick={onReview}>
          復習する（{reviewCount}）
        </button>
        <button type="button" className="btn btn--ghost" onClick={onHome}>
          ホームへ
        </button>
      </div>
    </section>
  );
}

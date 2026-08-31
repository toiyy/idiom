import { CONFIDENCES, CONFIDENCE_LABELS, type Progress } from '../lib/storage';

/**
 * 自信度ごとの正答率。満点狙いで見るべきは「勘・迷い」で正解した数で、
 * 見かけの正答率が実力を上回っているぶんがここに出る。
 */
export function ConfidenceTable({ progress }: { progress: Progress }) {
  if (progress.answered === 0) return null;

  const luckyCorrect = progress.byConfidence.guess.correct + progress.byConfidence.unsure.correct;

  return (
    <>
      <table className="conf-table">
        <thead>
          <tr>
            <th>自信度</th>
            <th>回答</th>
            <th>正解</th>
            <th>正答率</th>
          </tr>
        </thead>
        <tbody>
          {CONFIDENCES.map((c) => {
            const s = progress.byConfidence[c];
            return (
              <tr key={c}>
                <td>{CONFIDENCE_LABELS[c]}</td>
                <td>{s.answered}</td>
                <td>{s.correct}</td>
                <td>{s.answered === 0 ? '—' : `${Math.round((s.correct / s.answered) * 100)}%`}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {luckyCorrect > 0 && (
        <p className="conf-table__note">
          うち <strong>{luckyCorrect} 問</strong>{' '}
          は確信なしで正解しています。本番では落とす可能性があるため復習リストに残しています。
        </p>
      )}
    </>
  );
}

import { accuracy, confidenceAccuracy, type Snapshot } from '../lib/snapshots';

interface SnapshotListProps {
  snapshots: Snapshot[];
  onTake: () => void;
  onDelete: (takenAt: string) => void;
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/** 「9/03」のような短い日付。年をまたいでも並び順は takenAt で決まるので月日で足りる。 */
function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getMonth() + 1}/${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 学習記録。ある時点の成績を残し、推移を見るためのもの。
 * 実力の目安は累計正答率ではなく「自信あり」の正答率なので、その列を必ず出す。
 */
export function SnapshotList({ snapshots, onTake, onDelete }: SnapshotListProps) {
  return (
    <section className="card">
      <h2 className="section__title">記録（{snapshots.length} 件）</h2>

      {snapshots.length === 0 ? (
        <p className="note-list__empty">今の成績を残しておくと、あとから伸びを確かめられます。</p>
      ) : (
        <div className="snapshot__table-wrap">
          <table className="snapshot__table">
            <thead>
              <tr>
                <th>日付</th>
                <th>累計</th>
                <th>正答率</th>
                <th>自信あり</th>
                <th>要復習</th>
                <th aria-label="操作" />
              </tr>
            </thead>
            <tbody>
              {snapshots.map((s) => (
                <tr key={s.takenAt}>
                  <td>{shortDate(s.takenAt)}</td>
                  <td>
                    {s.correct}/{s.answered}
                  </td>
                  <td>{pct(accuracy(s.answered, s.correct))}</td>
                  <td className="snapshot__sure">{pct(confidenceAccuracy(s, 'sure'))}</td>
                  <td>{s.reviewCount}</td>
                  <td>
                    <button
                      type="button"
                      className="note-item__delete"
                      aria-label={`${shortDate(s.takenAt)} の記録を削除`}
                      onClick={() => onDelete(s.takenAt)}
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="snapshot__note">
        実力の目安は累計正答率ではなく<strong>「自信あり」の正答率</strong>です。
        復習で解き直したぶんも累計に足されるため、累計は実力より低めに出ます。
      </p>

      <button type="button" className="btn" onClick={onTake}>
        今の成績を記録する
      </button>
    </section>
  );
}

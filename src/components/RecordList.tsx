import { accuracy, confidenceAccuracy, toDeltas, type StudyRecord } from '../lib/records';

interface RecordListProps {
  records: StudyRecord[];
  onTake: () => void;
  onDelete: (takenAt: string) => void;
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/** 「9/03」のような短い日付。並び順は takenAt で決まるので月日で足りる。 */
function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getMonth() + 1}/${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 学習記録の一覧。
 *
 * 「前回記録してから今まで」に解いたぶんを 1 件として出す。累計は復習で解き直した
 * ぶんも足されて薄まるので、伸びを見るにはこの区切りのほうが分かりやすい。
 */
export function RecordList({ records, onTake, onDelete }: RecordListProps) {
  const deltas = toDeltas(records);

  return (
    <section className="card">
      <h2 className="section__title">記録（{records.length} 件）</h2>

      {deltas.length === 0 ? (
        <p className="note-list__empty">
          区切りのいいところで記録しておくと、次に記録するまでに解いたぶんが 1 件ずつ残ります。
        </p>
      ) : (
        <ul className="record-list">
          {deltas.map((d) => {
            const sure = d.byConfidence.sure;
            return (
              <li className="record-item" key={d.takenAt}>
                <p className="record-item__head">
                  <span className="record-item__date">{shortDate(d.takenAt)}</span>
                  <span className="record-item__span">前回から {d.answered} 問</span>
                  <button
                    type="button"
                    className="note-item__delete"
                    aria-label={`${shortDate(d.takenAt)} の記録を削除`}
                    onClick={() => onDelete(d.takenAt)}
                  >
                    削除
                  </button>
                </p>
                <p className="record-item__score">
                  {d.correct} / {d.answered}
                  <span className="record-item__pct">
                    （{pct(accuracy(d.answered, d.correct))}）
                  </span>
                  {sure.answered > 0 && (
                    <span className="record-item__sure">
                      自信あり {sure.correct}/{sure.answered}（{pct(confidenceAccuracy(d, 'sure'))}
                      ）
                    </span>
                  )}
                </p>
                <p className="record-item__review">
                  要復習 {d.reviewCount}
                  {d.reviewChange > 0 && (
                    <span className="record-item__down"> −{d.reviewChange}</span>
                  )}
                  {d.reviewChange < 0 && (
                    <span className="record-item__up"> +{-d.reviewChange}</span>
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <p className="record__note">
        実力の目安は正答率そのものより<strong>「自信あり」の正答率</strong>です。
        勘や迷いで当てたぶんは要復習に残るので、要復習の減り方も見てください。
      </p>

      <button type="button" className="btn" onClick={onTake}>
        ここまでを記録する
      </button>
    </section>
  );
}

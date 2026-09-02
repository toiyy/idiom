import type { Question } from '../types/question';
import type { Notes } from '../lib/notes';

interface NoteListProps {
  notes: Notes;
  pool: readonly Question[];
  onDelete: (questionId: string) => void;
}

/** メモを書いた問題の一覧。自分だけの弱点ノートとして通しで読み返すための画面。 */
export function NoteList({ notes, pool, onDelete }: NoteListProps) {
  // メモだけ残って問題が消えている場合に備え、プールにある問題の順で並べる
  const entries = pool.filter((q) => notes[q.id] !== undefined);

  return (
    <section className="card">
      <h2 className="section__title">メモ（{entries.length} 件）</h2>

      {entries.length === 0 ? (
        <p className="note-list__empty">回答後の画面でメモを書くと、ここに集まります。</p>
      ) : (
        <ul className="note-list">
          {entries.map((q) => (
            <li className="note-item" key={q.id}>
              <p className="note-item__head">
                <span className="note-item__category">{q.subcategory ?? q.category}</span>
                <button
                  type="button"
                  className="note-item__delete"
                  aria-label={`${q.id} のメモを削除`}
                  onClick={() => onDelete(q.id)}
                >
                  削除
                </button>
              </p>
              <p className="note-item__sentence">{q.sentence}</p>
              <p className="note-item__answer">正解: {q.choices[q.answerIndex]}</p>
              <p className="note-item__note">{notes[q.id]}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

import type { Guide } from '../types/guide';

interface GuideViewProps {
  guide: Guide;
  /** そのカテゴリの問題数。読み終えてすぐ解きに行けるようにする。 */
  questionCount: number;
  onStart: () => void;
  onBack: () => void;
}

/** カテゴリ解説。参考書の 1 章として通しで読めるようにする。 */
export function GuideView({ guide, questionCount, onStart, onBack }: GuideViewProps) {
  return (
    <section className="card guide">
      <h2 className="section__title">{guide.category}</h2>
      <p className="guide__summary">{guide.summary}</p>

      {guide.sections.map((section) => (
        <section className="guide__section" key={section.heading}>
          <h3 className="guide__heading">{section.heading}</h3>

          {section.body?.map((paragraph) => (
            <p className="guide__body" key={paragraph}>
              {paragraph}
            </p>
          ))}

          {section.table && (
            // 列が多い表は横に長くなるので、はみ出したぶんだけ横スクロールさせる
            <div className="guide__table-wrap">
              <table className="guide__table">
                <thead>
                  <tr>
                    {section.table.headers.map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section.table.rows.map((row) => (
                    <tr key={row.join('|')}>
                      {row.map((cell, i) => (
                        <td key={i}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {section.examples && (
            <ul className="guide__examples">
              {section.examples.map((ex) => (
                <li
                  className={`guide__example${ex.ok === false ? ' is-wrong' : ex.ok ? ' is-ok' : ''}`}
                  key={ex.en}
                >
                  <p className="guide__en">
                    {ex.ok !== undefined && (
                      <span className="guide__mark" aria-hidden="true">
                        {ex.ok ? '○' : '×'}
                      </span>
                    )}
                    {ex.en}
                  </p>
                  {ex.ja !== '—' && <p className="guide__ja">{ex.ja}</p>}
                  {ex.note && <p className="guide__note">{ex.note}</p>}
                </li>
              ))}
            </ul>
          )}

          {section.pitfall && (
            <p className="guide__pitfall">
              <strong>落とし穴</strong>
              {section.pitfall}
            </p>
          )}
        </section>
      ))}

      <div className="guide__actions">
        <button type="button" className="btn btn--primary" onClick={onStart}>
          このカテゴリを解く（{questionCount} 問）
        </button>
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          ホームへ
        </button>
      </div>
    </section>
  );
}

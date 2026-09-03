import { useState } from 'react';
import type { Guide } from '../types/guide';

interface GuideViewProps {
  guide: Guide;
  /**
   * 受け持つ出題単位。読み終えてすぐ解きに行けるようにする。
   * 解いている途中で開いたときは、いまのセッションを壊さないよう空にする。
   */
  targets: { label: string; count: number; onStart: () => void }[];
  backLabel: string;
  onBack: () => void;
}

/**
 * カテゴリ解説。
 *
 * 覚えるべき要点だけを並べて通しで復習できるようにし、
 * 詳しい説明・表・例文は畳んでおいて必要なときだけ開く。
 */
export function GuideView({ guide, targets, backLabel, onBack }: GuideViewProps) {
  const [openSections, setOpenSections] = useState<ReadonlySet<string>>(new Set());
  const allOpen = openSections.size === guide.sections.length;

  function toggle(heading: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(heading)) next.delete(heading);
      else next.add(heading);
      return next;
    });
  }

  function toggleAll() {
    setOpenSections(allOpen ? new Set() : new Set(guide.sections.map((s) => s.heading)));
  }

  return (
    <section className="card guide">
      <header className="guide__header">
        <h2 className="section__title">{guide.title}</h2>
        <button type="button" className="btn btn--ghost guide__toggle-all" onClick={toggleAll}>
          {allOpen ? 'すべて閉じる' : 'すべて開く'}
        </button>
      </header>

      <p className="guide__summary">{guide.summary}</p>

      {guide.sections.map((section) => {
        const open = openSections.has(section.heading);
        const detailId = `guide-detail-${section.heading}`;

        return (
          <section className="guide__section" key={section.heading}>
            <h3 className="guide__heading">{section.heading}</h3>
            {section.point && <p className="guide__point">{section.point}</p>}

            {/* 覚える中身はここ。畳まずに常に出しておく */}
            {section.columns && (
              <div className="guide__columns">
                {section.columns.map((column) => (
                  <div className={`guide__column is-${column.tone ?? 'plain'}`} key={column.title}>
                    <p className="guide__column-title">{column.title}</p>
                    <ul className="guide__column-items">
                      {column.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              className="guide__more"
              aria-expanded={open}
              aria-controls={detailId}
              onClick={() => toggle(section.heading)}
            >
              {open ? '閉じる' : '詳しく'}
              <span className={`guide__caret${open ? ' is-open' : ''}`} aria-hidden="true">
                ▾
              </span>
            </button>

            <div className="guide__detail" id={detailId} hidden={!open}>
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
                      className={`guide__example${
                        ex.ok === false ? ' is-wrong' : ex.ok ? ' is-ok' : ''
                      }`}
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
            </div>
          </section>
        );
      })}

      <div className="guide__actions">
        {targets.map((t) => (
          <button type="button" className="btn btn--primary" key={t.label} onClick={t.onStart}>
            {t.label}を解く（{t.count} 問）
          </button>
        ))}
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          {backLabel}
        </button>
      </div>
    </section>
  );
}

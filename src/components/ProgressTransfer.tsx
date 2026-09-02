import { useState } from 'react';
import { exportBackup, parseBackup, type Backup } from '../lib/backup';
import { countNotes } from '../lib/notes';

/** 開いているパネル。null なら閉じている。 */
type Panel = null | 'export' | 'import';

interface ProgressTransferProps {
  backup: Backup;
  onImport: (next: Backup) => void;
}

/**
 * 進捗の書き出し／取り込み。
 * localStorage は端末ごとに独立しているため、スマホで解いた結果を PC に移す手段がこれしかない。
 */
export function ProgressTransfer({ backup, onImport }: ProgressTransferProps) {
  const [panel, setPanel] = useState<Panel>(null);
  const [text, setText] = useState('');
  const [message, setMessage] = useState('');

  async function handleExport() {
    const json = exportBackup(backup);
    setPanel('export');
    setText(json);
    // クリップボードが使えない環境もあるので、まずは手でコピーする案内を出しておく
    setMessage('下のテキストを全選択してコピーしてください。');
    try {
      await navigator.clipboard.writeText(json);
      setMessage('クリップボードにコピーしました。');
    } catch {
      // 権限や非セキュアコンテキストで失敗する。案内はそのまま残す
    }
  }

  function handleOpenImport() {
    setPanel('import');
    setText('');
    setMessage('書き出した JSON を貼り付けて「読み込む」を押してください。');
  }

  function handleApplyImport() {
    const next = parseBackup(text);
    if (!next) {
      setMessage('読み込めませんでした。書き出した JSON をそのまま貼り付けてください。');
      return;
    }
    onImport(next);
    setPanel(null);
    setText('');
    setMessage(
      `取り込みました（累計 ${next.progress.correct} / ${next.progress.answered} 問、` +
        `要復習 ${next.progress.wrongIds.length} 問、メモ ${countNotes(next.notes)} 件）。`,
    );
  }

  function handleClose() {
    setPanel(null);
    setText('');
    setMessage('');
  }

  return (
    <section className="card">
      <h2 className="section__title">データの書き出し／取り込み</h2>
      <p className="transfer__lead">
        進捗とメモはブラウザごとに保存されます。端末をまたいで引き継ぐときはここから移してください。
        取り込むと現在の累計・復習リスト・メモは<strong>置き換わります</strong>。
      </p>

      <div className="transfer__actions">
        <button type="button" className="btn" onClick={handleExport}>
          書き出す
        </button>
        <button type="button" className="btn" onClick={handleOpenImport}>
          取り込む
        </button>
        {panel !== null && (
          <button type="button" className="btn btn--ghost" onClick={handleClose}>
            閉じる
          </button>
        )}
      </div>

      {panel !== null && (
        <textarea
          className="transfer__area"
          aria-label={panel === 'export' ? '書き出した進捗' : '取り込む進捗'}
          rows={8}
          spellCheck={false}
          readOnly={panel === 'export'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={panel === 'export' ? (e) => e.currentTarget.select() : undefined}
        />
      )}

      {panel === 'import' && (
        <button type="button" className="btn btn--primary" onClick={handleApplyImport}>
          読み込む
        </button>
      )}

      {message !== '' && (
        <p className="transfer__message" role="status">
          {message}
        </p>
      )}
    </section>
  );
}

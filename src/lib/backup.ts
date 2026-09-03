/**
 * 端末をまたいで学習データを移すための書き出し／取り込み。
 * localStorage はブラウザごとに独立しているため、スマホで解いた結果を PC で見る手段がこれしかない。
 */

import { normalizeProgress, type Progress } from './storage';
import { normalizeNotes, type Notes } from './notes';
import { normalizeSnapshots, type Snapshot } from './snapshots';

export interface Backup {
  progress: Progress;
  notes: Notes;
  snapshots: Snapshot[];
}

interface BackupPayload extends Backup {
  app: 'idiom';
  kind: 'backup';
  version: 4;
  exportedAt: string;
}

export function exportBackup(backup: Backup): string {
  const payload: BackupPayload = {
    app: 'idiom',
    kind: 'backup',
    version: 4,
    exportedAt: new Date().toISOString(),
    progress: backup.progress,
    notes: backup.notes,
    snapshots: backup.snapshots,
  };
  return JSON.stringify(payload, null, 2);
}

function isCount(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0;
}

/**
 * 書き出した JSON を Backup に戻す。取り込めない入力は null を返す。
 * 包んだ形と、localStorage の進捗の生の値の両方を受け付ける。
 * メモや記録を持たない古い書き出しは、それらなしとして取り込む。
 */
export function parseBackup(text: string): Backup | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;

  const inner = (parsed as { progress?: unknown }).progress;
  const wrapped = typeof inner === 'object' && inner !== null;
  const body = wrapped ? inner : parsed;
  const o = body as Partial<Progress>;

  // 進捗として最低限の形がそろっていなければ、無関係な JSON を貼られたとみなす
  if (!isCount(o.answered) || !isCount(o.correct)) return null;
  if (!Array.isArray(o.wrongIds)) return null;
  if (o.correct > o.answered) return null;

  return {
    progress: normalizeProgress(body),
    // メモと記録は包んだ形のときだけ入っている
    notes: wrapped ? normalizeNotes((parsed as { notes?: unknown }).notes) : {},
    snapshots: wrapped ? normalizeSnapshots((parsed as { snapshots?: unknown }).snapshots) : [],
  };
}

/**
 * 学習記録。ある時点の成績を日付つきで残し、推移を見られるようにする。
 *
 * 進捗（idiom.progress.v2）とは別キーに持つ。累計をリセットしても記録は消えない。
 */
import type { Confidence, ConfidenceStats, Progress } from './storage';

const SNAPSHOTS_KEY = 'idiom.snapshots.v1';

/** 残せる件数の上限。古いものから捨てる。 */
export const MAX_SNAPSHOTS = 200;

export interface Snapshot {
  /** 記録した時刻（ISO 文字列）。一覧の並び順と重複判定に使う。 */
  takenAt: string;
  answered: number;
  correct: number;
  /** そのときの要復習の件数。 */
  reviewCount: number;
  byConfidence: ConfidenceStats;
}

function safeGetStorage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const probe = '__idiom_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
}

function toStat(raw: unknown): { answered: number; correct: number } {
  const o = (raw ?? {}) as { answered?: unknown; correct?: unknown };
  return {
    answered: typeof o.answered === 'number' && o.answered >= 0 ? o.answered : 0,
    correct: typeof o.correct === 'number' && o.correct >= 0 ? o.correct : 0,
  };
}

function isCount(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0;
}

/** 読み込んだ 1 件を Snapshot に正規化する。成立しない値は null。 */
function toSnapshot(raw: unknown): Snapshot | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Partial<Snapshot>;
  if (typeof o.takenAt !== 'string' || o.takenAt === '') return null;
  if (!isCount(o.answered) || !isCount(o.correct) || o.correct > o.answered) return null;
  const stats = (o.byConfidence ?? {}) as Partial<ConfidenceStats>;
  return {
    takenAt: o.takenAt,
    answered: o.answered,
    correct: o.correct,
    reviewCount: isCount(o.reviewCount) ? o.reviewCount : 0,
    byConfidence: {
      sure: toStat(stats.sure),
      unsure: toStat(stats.unsure),
      guess: toStat(stats.guess),
    },
  };
}

/** 読み込んだ値を一覧に正規化する。新しい順に並べ、壊れた要素は捨てる。 */
export function normalizeSnapshots(raw: unknown): Snapshot[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(toSnapshot)
    .filter((s): s is Snapshot => s !== null)
    .sort((a, b) => b.takenAt.localeCompare(a.takenAt))
    .slice(0, MAX_SNAPSHOTS);
}

export function loadSnapshots(): Snapshot[] {
  const store = safeGetStorage();
  if (!store) return [];
  try {
    const raw = store.getItem(SNAPSHOTS_KEY);
    if (!raw) return [];
    return normalizeSnapshots(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveSnapshots(snapshots: readonly Snapshot[]): void {
  const store = safeGetStorage();
  if (!store) return;
  try {
    store.setItem(SNAPSHOTS_KEY, JSON.stringify(snapshots));
  } catch {
    // 保存できなくても学習は続けられるので無視
  }
}

/** いまの進捗から 1 件作る。 */
export function takeSnapshot(
  progress: Progress,
  reviewCount: number,
  takenAt: Date = new Date(),
): Snapshot {
  return {
    takenAt: takenAt.toISOString(),
    answered: progress.answered,
    correct: progress.correct,
    reviewCount,
    byConfidence: progress.byConfidence,
  };
}

export function addSnapshot(prev: readonly Snapshot[], snapshot: Snapshot): Snapshot[] {
  return [snapshot, ...prev]
    .sort((a, b) => b.takenAt.localeCompare(a.takenAt))
    .slice(0, MAX_SNAPSHOTS);
}

export function removeSnapshot(prev: readonly Snapshot[], takenAt: string): Snapshot[] {
  return prev.filter((s) => s.takenAt !== takenAt);
}

/** 正答率。回答が 0 件なら 0 を返す。 */
export function accuracy(answered: number, correct: number): number {
  return answered === 0 ? 0 : correct / answered;
}

/** 自信度別の正答率。 */
export function confidenceAccuracy(snapshot: Snapshot, confidence: Confidence): number {
  const s = snapshot.byConfidence[confidence];
  return accuracy(s.answered, s.correct);
}

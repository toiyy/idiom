/**
 * 学習記録。「前回記録してから今まで」に解いたぶんを 1 件として残す。
 *
 * 保存するのは記録した時点の累計。表示するときに前の記録との差を取ることで、
 * 1 カテゴリでも 20 カテゴリでも「その間にやったぶん」がまとめて 1 件になる。
 * 進捗（idiom.progress.v2）とは別キーなので、累計をリセットしても記録は消えない。
 */
import { emptyConfidenceStats, type Confidence, type ConfidenceStats } from './storage';
import type { Progress } from './storage';

const RECORDS_KEY = 'idiom.records.v1';

/** 残せる件数の上限。古いものから捨てる。 */
export const MAX_RECORDS = 200;

/** 記録した時点の累計。差を取るためにそのまま持つ。 */
export interface StudyRecord {
  /** 記録した時刻（ISO 文字列）。並び順と重複判定に使う。 */
  takenAt: string;
  answered: number;
  correct: number;
  byConfidence: ConfidenceStats;
  /** 記録した時点の要復習の件数。減り具合を見るために持つ。 */
  reviewCount: number;
}

/** 前の記録からの伸び。画面に出すのはこちら。 */
export interface RecordDelta {
  takenAt: string;
  /** その間に解いた問題数。 */
  answered: number;
  correct: number;
  byConfidence: ConfidenceStats;
  /** 記録した時点の要復習の件数。 */
  reviewCount: number;
  /** 前の記録から要復習が何件減ったか。増えていれば負。 */
  reviewChange: number;
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

/** 読み込んだ 1 件を正規化する。成立しない値は null。 */
function toRecord(raw: unknown): StudyRecord | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Partial<StudyRecord>;
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
export function normalizeRecords(raw: unknown): StudyRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(toRecord)
    .filter((r): r is StudyRecord => r !== null)
    .sort((a, b) => b.takenAt.localeCompare(a.takenAt))
    .slice(0, MAX_RECORDS);
}

export function loadRecords(): StudyRecord[] {
  const store = safeGetStorage();
  if (!store) return [];
  try {
    const raw = store.getItem(RECORDS_KEY);
    if (!raw) return [];
    return normalizeRecords(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveRecords(records: readonly StudyRecord[]): void {
  const store = safeGetStorage();
  if (!store) return;
  try {
    store.setItem(RECORDS_KEY, JSON.stringify(records));
  } catch {
    // 保存できなくても学習は続けられるので無視
  }
}

/** いまの進捗から 1 件作る。 */
export function takeRecord(
  progress: Progress,
  reviewCount: number,
  takenAt: Date = new Date(),
): StudyRecord {
  return {
    takenAt: takenAt.toISOString(),
    answered: progress.answered,
    correct: progress.correct,
    reviewCount,
    byConfidence: progress.byConfidence,
  };
}

export function addRecord(prev: readonly StudyRecord[], record: StudyRecord): StudyRecord[] {
  return [record, ...prev].sort((a, b) => b.takenAt.localeCompare(a.takenAt)).slice(0, MAX_RECORDS);
}

export function removeRecord(prev: readonly StudyRecord[], takenAt: string): StudyRecord[] {
  return prev.filter((r) => r.takenAt !== takenAt);
}

function statDelta(now: ConfidenceStats, before: ConfidenceStats): ConfidenceStats {
  const stats = emptyConfidenceStats();
  for (const c of ['sure', 'unsure', 'guess'] as const) {
    stats[c] = {
      answered: Math.max(0, now[c].answered - before[c].answered),
      correct: Math.max(0, now[c].correct - before[c].correct),
    };
  }
  return stats;
}

/**
 * 各記録を「前の記録からの伸び」に変換する。新しい順のまま返す。
 *
 * 累計をリセットすると数が巻き戻るので、前の記録より小さくなっていたら
 * 差ではなくその記録自体を伸びとして扱う。
 */
export function toDeltas(records: readonly StudyRecord[]): RecordDelta[] {
  return records.map((r, i) => {
    const before = records[i + 1];
    const reset = before === undefined || before.answered > r.answered;
    if (reset) {
      return {
        takenAt: r.takenAt,
        answered: r.answered,
        correct: r.correct,
        byConfidence: r.byConfidence,
        reviewCount: r.reviewCount,
        reviewChange: 0,
      };
    }
    return {
      takenAt: r.takenAt,
      answered: r.answered - before.answered,
      correct: r.correct - before.correct,
      byConfidence: statDelta(r.byConfidence, before.byConfidence),
      reviewCount: r.reviewCount,
      reviewChange: before.reviewCount - r.reviewCount,
    };
  });
}

/** 正答率。回答が 0 件なら 0 を返す。 */
export function accuracy(answered: number, correct: number): number {
  return answered === 0 ? 0 : correct / answered;
}

/** 自信度別の正答率。 */
export function confidenceAccuracy(delta: RecordDelta, confidence: Confidence): number {
  const s = delta.byConfidence[confidence];
  return accuracy(s.answered, s.correct);
}

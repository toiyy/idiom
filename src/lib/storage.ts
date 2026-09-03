/**
 * localStorage への進捗保存ラッパ。
 * localStorage が使えない環境（プライベートモード等）でも落ちないよう握り込む。
 */

const STORAGE_KEY = 'idiom.progress.v2';
/** v1（自信度導入前）のキー。初回だけ読み込んで引き継ぐ。 */
const LEGACY_KEY = 'idiom.progress.v1';

/** 回答時の自信度。正誤を見る前に自己申告する。 */
export type Confidence = 'sure' | 'unsure' | 'guess';

export const CONFIDENCES: readonly Confidence[] = ['sure', 'unsure', 'guess'];

export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  sure: '自信あり',
  unsure: '迷った',
  guess: '勘',
};

export interface ConfidenceStat {
  answered: number;
  correct: number;
}

export type ConfidenceStats = Record<Confidence, ConfidenceStat>;

export interface Progress {
  /** これまでの累計回答数 */
  answered: number;
  /** これまでの累計正解数 */
  correct: number;
  /**
   * 要復習の問題 id。「自信ありで正解」以外はすべてここに入る。
   * 誤答はもちろん、勘や迷いで正解した問題も未習得とみなす。
   */
  wrongIds: string[];
  /** 自信度ごとの回答数・正解数 */
  byConfidence: ConfidenceStats;
  /** 最終更新（ISO 文字列） */
  updatedAt: string;
}

/**
 * 復習リストに残す上限。
 * 問題バンクの総数を十分に上回る値にしておく（超えると古い間違いから復習に出てこなくなる）。
 * プールにない id は出題時に無視されるため、多少余分に持っていても害はない。
 */
export const MAX_WRONG_IDS = 2000;

export function emptyConfidenceStats(): ConfidenceStats {
  return {
    sure: { answered: 0, correct: 0 },
    unsure: { answered: 0, correct: 0 },
    guess: { answered: 0, correct: 0 },
  };
}

export function makeEmptyProgress(): Progress {
  return {
    answered: 0,
    correct: 0,
    wrongIds: [],
    byConfidence: emptyConfidenceStats(),
    updatedAt: new Date(0).toISOString(),
  };
}

function safeGetStorage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    // アクセス自体が例外を投げる環境があるため touch して確認
    const probe = '__idiom_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
}

function toStat(raw: unknown): ConfidenceStat {
  const o = (raw ?? {}) as Partial<ConfidenceStat>;
  return {
    answered: typeof o.answered === 'number' ? o.answered : 0,
    correct: typeof o.correct === 'number' ? o.correct : 0,
  };
}

/** 読み込んだ値を Progress に正規化する。壊れた値は既定値で埋める。 */
export function normalizeProgress(raw: unknown): Progress {
  const parsed = (raw ?? {}) as Partial<Progress>;
  const stats = (parsed.byConfidence ?? {}) as Partial<ConfidenceStats>;
  return {
    answered: typeof parsed.answered === 'number' ? parsed.answered : 0,
    correct: typeof parsed.correct === 'number' ? parsed.correct : 0,
    wrongIds: Array.isArray(parsed.wrongIds)
      ? parsed.wrongIds.filter((x) => typeof x === 'string')
      : [],
    byConfidence: {
      sure: toStat(stats.sure),
      unsure: toStat(stats.unsure),
      guess: toStat(stats.guess),
    },
    updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date(0).toISOString(),
  };
}

export function loadProgress(): Progress {
  const store = safeGetStorage();
  if (!store) return makeEmptyProgress();
  try {
    // v2 がなければ v1 から累計と復習リストだけ引き継ぐ（自信度の内訳は不明なので空のまま）
    const raw = store.getItem(STORAGE_KEY) ?? store.getItem(LEGACY_KEY);
    if (!raw) return makeEmptyProgress();
    return normalizeProgress(JSON.parse(raw));
  } catch {
    return makeEmptyProgress();
  }
}

export function saveProgress(progress: Progress): void {
  const store = safeGetStorage();
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // 保存できなくても学習は継続できるので無視
  }
}

/**
 * 「自信ありで正解」だけが習得済み。それ以外は復習対象に残す。
 * 勘や迷いで当たった問題は、正答率上は正解でも本番では落とす可能性が高いため。
 */
export function isMastered(correct: boolean, confidence: Confidence): boolean {
  return correct && confidence === 'sure';
}

export function recordAnswer(
  prev: Progress,
  questionId: string,
  correct: boolean,
  confidence: Confidence,
): Progress {
  const mastered = isMastered(correct, confidence);
  const wrongIds = mastered
    ? prev.wrongIds.filter((id) => id !== questionId)
    : [questionId, ...prev.wrongIds.filter((id) => id !== questionId)].slice(0, MAX_WRONG_IDS);

  const stat = prev.byConfidence[confidence];
  return {
    answered: prev.answered + 1,
    correct: prev.correct + (correct ? 1 : 0),
    wrongIds,
    byConfidence: {
      ...prev.byConfidence,
      [confidence]: {
        answered: stat.answered + 1,
        correct: stat.correct + (correct ? 1 : 0),
      },
    },
    updatedAt: new Date().toISOString(),
  };
}

export function resetProgress(): Progress {
  const store = safeGetStorage();
  if (store) {
    try {
      store.removeItem(STORAGE_KEY);
      store.removeItem(LEGACY_KEY);
    } catch {
      // 無視
    }
  }
  return makeEmptyProgress();
}

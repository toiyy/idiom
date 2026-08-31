/**
 * localStorage への進捗保存ラッパ。
 * localStorage が使えない環境（プライベートモード等）でも落ちないよう握り込む。
 */

const STORAGE_KEY = 'idiom.progress.v1';

export interface Progress {
  /** これまでの累計回答数 */
  answered: number;
  /** これまでの累計正解数 */
  correct: number;
  /** 直近で間違えた問題 id（復習機能の土台。最小スコープでは表示のみ想定） */
  wrongIds: string[];
  /** 最終更新（ISO 文字列） */
  updatedAt: string;
}

export const emptyProgress: Progress = {
  answered: 0,
  correct: 0,
  wrongIds: [],
  updatedAt: new Date(0).toISOString(),
};

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

export function loadProgress(): Progress {
  const store = safeGetStorage();
  if (!store) return { ...emptyProgress };
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return { ...emptyProgress };
    const parsed = JSON.parse(raw) as Partial<Progress>;
    return {
      answered: typeof parsed.answered === 'number' ? parsed.answered : 0,
      correct: typeof parsed.correct === 'number' ? parsed.correct : 0,
      wrongIds: Array.isArray(parsed.wrongIds)
        ? parsed.wrongIds.filter((x) => typeof x === 'string')
        : [],
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : emptyProgress.updatedAt,
    };
  } catch {
    return { ...emptyProgress };
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

export function recordAnswer(prev: Progress, questionId: string, correct: boolean): Progress {
  const wrongIds = correct
    ? prev.wrongIds.filter((id) => id !== questionId)
    : [questionId, ...prev.wrongIds.filter((id) => id !== questionId)].slice(0, 100);
  return {
    answered: prev.answered + 1,
    correct: prev.correct + (correct ? 1 : 0),
    wrongIds,
    updatedAt: new Date().toISOString(),
  };
}

export function resetProgress(): Progress {
  const store = safeGetStorage();
  if (store) {
    try {
      store.removeItem(STORAGE_KEY);
    } catch {
      // 無視
    }
  }
  return { ...emptyProgress };
}

import type { Question } from '../types/question';

export type RandomFn = () => number;

/** 出題モード。スタート画面での選択結果を表す。 */
export type QuizMode =
  { kind: 'all' } | { kind: 'review' } | { kind: 'category'; category: string };

/**
 * Fisher–Yates シャッフル。元配列は破壊しない。
 * rng を差し替えられるのでテストで決定的に検証できる。
 */
export function shuffle<T>(items: readonly T[], rng: RandomFn = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * モードに応じて出題対象を絞り込む（順序はプールのまま。シャッフルは buildQuizOrder が行う）。
 * review では wrongIds に載っている問題だけを残す。プールに存在しない id は自然に無視される。
 */
export function selectQuestions(
  pool: readonly Question[],
  mode: QuizMode,
  wrongIds: readonly string[] = [],
): Question[] {
  switch (mode.kind) {
    case 'all':
      return [...pool];
    case 'review': {
      const target = new Set(wrongIds);
      return pool.filter((q) => target.has(q.id));
    }
    case 'category':
      return pool.filter((q) => q.category === mode.category);
  }
}

/** 出題順を組み立てる。絞り込み済みのプールをシャッフルするだけ。 */
export function buildQuizOrder(pool: readonly Question[], rng: RandomFn = Math.random): Question[] {
  return shuffle(pool, rng);
}

export interface CategorySummary {
  category: string;
  /** そのカテゴリの総問題数 */
  total: number;
  /** そのカテゴリのうち要復習の問題数 */
  wrong: number;
}

/**
 * カテゴリ一覧を問題数つきで返す。初出順を保つのでスタート画面の並びが安定する。
 */
export function listCategories(
  pool: readonly Question[],
  wrongIds: readonly string[] = [],
): CategorySummary[] {
  const target = new Set(wrongIds);
  const byCategory = new Map<string, CategorySummary>();
  for (const q of pool) {
    const entry = byCategory.get(q.category) ?? { category: q.category, total: 0, wrong: 0 };
    entry.total += 1;
    if (target.has(q.id)) entry.wrong += 1;
    byCategory.set(q.category, entry);
  }
  return [...byCategory.values()];
}

/** 要復習として実際に出題できる問題数（プールに存在しない id は数えない）。 */
export function countReviewable(pool: readonly Question[], wrongIds: readonly string[]): number {
  return selectQuestions(pool, { kind: 'review' }, wrongIds).length;
}

export function isCorrect(question: Question, selectedIndex: number): boolean {
  return question.answerIndex === selectedIndex;
}

export interface ScoreSummary {
  total: number;
  correct: number;
  /** 0〜1。total が 0 のときは 0。 */
  accuracy: number;
}

export function summarize(total: number, correct: number): ScoreSummary {
  return {
    total,
    correct,
    accuracy: total === 0 ? 0 : correct / total,
  };
}

/** モードの表示名。画面ヘッダーや結果画面で使う。 */
export function modeLabel(mode: QuizMode): string {
  switch (mode.kind) {
    case 'all':
      return '全問';
    case 'review':
      return '復習';
    case 'category':
      return mode.category;
  }
}

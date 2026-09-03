import { GuideListSchema, targetKey, type Guide } from '../types/guide';

/**
 * カテゴリ解説の読み込み口。問題データと同じく JSON を置くだけで増える。
 * すべてのカテゴリに解説があるとは限らないので、呼び出し側は存在しない前提で扱う。
 */
const modules = import.meta.glob<{ default: unknown }>('./guides/*.json', { eager: true });

function loadAll(): Guide[] {
  const merged = Object.keys(modules)
    .sort()
    .map((path) => modules[path].default);

  const result = GuideListSchema.safeParse(merged);
  if (!result.success) {
    throw new Error(`解説データの検証に失敗しました:\n${result.error.toString()}`);
  }
  return result.data;
}

export const guides: Guide[] = loadAll();

// 1 本の解説が複数の出題単位を受け持つので、引けるよう展開しておく
const byTarget = new Map(guides.flatMap((g) => g.targets.map((t) => [targetKey(t), g] as const)));

/**
 * その出題単位の解説を返す。
 * サブカテゴリ専用の解説がなければ、カテゴリ全体の解説を探す。
 */
export function findGuide(category: string, subcategory?: string): Guide | undefined {
  if (subcategory !== undefined) {
    const specific = byTarget.get(targetKey({ category, subcategory }));
    if (specific) return specific;
  }
  return byTarget.get(category);
}

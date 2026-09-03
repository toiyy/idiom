import { GuideListSchema, type Guide } from '../types/guide';

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

const byCategory = new Map(guides.map((g) => [g.category, g]));

export function findGuide(category: string): Guide | undefined {
  return byCategory.get(category);
}

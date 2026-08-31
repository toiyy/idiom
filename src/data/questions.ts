import { QuestionListSchema, type QuestionList } from '../types/question';

/**
 * 問題データの読み込み口。
 *
 * `src/data/questions/*.json` を Vite の glob import ですべて取り込むので、
 * 問題を増やすときは JSON ファイルを置くだけでよく、このファイルの変更は不要。
 * 取り込んだ全問は起動時に Zod スキーマで一括検証される。
 */
const modules = import.meta.glob<{ default: unknown }>('./questions/*.json', { eager: true });

function loadAll(): QuestionList {
  // ファイル名順に読むことで出題プールの並びを再現可能にする
  const merged = Object.keys(modules)
    .sort()
    .flatMap((path) => modules[path].default as unknown[]);

  const result = QuestionListSchema.safeParse(merged);
  if (!result.success) {
    // 問題データの不備は開発中に気づけるよう明示的に落とす
    throw new Error(`問題データの検証に失敗しました:\n${result.error.toString()}`);
  }
  return result.data;
}

export const questions: QuestionList = loadAll();

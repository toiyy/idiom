import type { Question } from '../types/question';

const LEVEL = /^ターゲット(\d{3})(?:～(\d{3}))?点レベル$/;

/**
 * 元教材での位置づけを「実践 800」の形で返す。
 * ロジカル英文法の取り込み分だけが種別（例題 / 実践）とレベルのタグを持つので、
 * それ以外の問題では undefined を返し、表示側は何も出さない。
 */
export function sourceLabel(question: Pick<Question, 'tags'>): string | undefined {
  const type = question.tags?.find((t) => t === '例題' || t === '実践');
  const level = question.tags?.map((t) => t.match(LEVEL)).find((m) => m !== null);
  if (type === undefined || level === undefined || level === null) return undefined;
  const range = level[2] === undefined ? level[1] : `${level[1]}～${level[2]}`;
  return `${type} ${range}`;
}

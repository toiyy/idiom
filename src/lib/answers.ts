/**
 * セッション中の 1 問ごとの回答状態。
 *
 * 前の問題に戻れるようにするため、現在の 1 問ぶんではなく出題順ぶんまとめて持つ。
 * 戻ったときに選んだ選択肢・自信度・正誤をそのまま再表示できる。
 */
import type { Question } from '../types/question';
import type { Confidence } from './storage';

export interface Answer {
  /** 選んだ選択肢。 */
  selectedIndex: number;
  /** 自信度。未申告のあいだは null で、正誤は伏せたままになる。 */
  confidence: Confidence | null;
}

/** 出題順と同じ長さの配列。まだ手を付けていない問題は null。 */
export type Answers = readonly (Answer | null)[];

export function emptyAnswers(size: number): Answers {
  return Array.from({ length: size }, () => null);
}

export function setAnswer(prev: Answers, index: number, answer: Answer): Answers {
  const next = [...prev];
  next[index] = answer;
  return next;
}

/** 自信度まで申告して正誤が確定した回答か。 */
export function isRevealed(answer: Answer | null): boolean {
  return answer !== null && answer.confidence !== null;
}

/**
 * 正解数。正誤が確定した回答だけを数えるので、
 * 前に戻って解答済みの問題を見返しても二重に数えない。
 */
export function countCorrect(order: readonly Question[], answers: Answers): number {
  let n = 0;
  for (const [i, answer] of answers.entries()) {
    if (!isRevealed(answer) || order[i] === undefined) continue;
    if (answer!.selectedIndex === order[i].answerIndex) n += 1;
  }
  return n;
}

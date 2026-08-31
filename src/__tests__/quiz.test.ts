import { describe, expect, it } from 'vitest';
import {
  buildQuizOrder,
  countReviewable,
  isCorrect,
  listCategories,
  modeLabel,
  selectQuestions,
  shuffle,
  summarize,
} from '../lib/quiz';
import type { Question } from '../types/question';

function makeQuestion(id: string, category = 'テスト', answerIndex: 0 | 1 | 2 | 3 = 0): Question {
  return {
    id,
    part: 5,
    category,
    sentence: 'This is ___ test.',
    choices: ['a', 'b', 'c', 'd'],
    answerIndex,
    explanation: 'dummy',
  };
}

const pool = [
  makeQuestion('q1', '時制'),
  makeQuestion('q2', '時制'),
  makeQuestion('q3', '前置詞'),
  makeQuestion('q4', '比較'),
];

// 0 を返し続ける rng は Fisher–Yates で各要素を残り先頭と入れ替える → 決定的
const zeroRng = () => 0;

describe('shuffle', () => {
  it('元配列を破壊しない', () => {
    const src = [1, 2, 3, 4];
    shuffle(src, zeroRng);
    expect(src).toEqual([1, 2, 3, 4]);
  });

  it('同じ要素を過不足なく含む', () => {
    const src = [1, 2, 3, 4, 5];
    const out = shuffle(src, () => 0.42);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('rng が決定的なら結果も決定的', () => {
    const src = ['a', 'b', 'c', 'd'];
    expect(shuffle(src, zeroRng)).toEqual(shuffle(src, zeroRng));
  });
});

describe('selectQuestions', () => {
  it('all は全問返す', () => {
    expect(selectQuestions(pool, { kind: 'all' })).toHaveLength(4);
  });

  it('category は該当カテゴリだけ返す', () => {
    const out = selectQuestions(pool, { kind: 'category', category: '時制' });
    expect(out.map((q) => q.id)).toEqual(['q1', 'q2']);
  });

  it('該当カテゴリがなければ空', () => {
    expect(selectQuestions(pool, { kind: 'category', category: '存在しない' })).toEqual([]);
  });

  it('review は wrongIds に載っている問題だけ返す', () => {
    const out = selectQuestions(pool, { kind: 'review' }, ['q3', 'q1']);
    expect(out.map((q) => q.id)).toEqual(['q1', 'q3']);
  });

  it('review でプールに存在しない id は無視する', () => {
    const out = selectQuestions(pool, { kind: 'review' }, ['deleted-id', 'q4']);
    expect(out.map((q) => q.id)).toEqual(['q4']);
  });

  it('wrongIds が空なら review は空', () => {
    expect(selectQuestions(pool, { kind: 'review' }, [])).toEqual([]);
  });
});

describe('countReviewable', () => {
  it('プールに実在する要復習だけ数える', () => {
    expect(countReviewable(pool, ['q1', 'q2', 'deleted-id'])).toBe(2);
    expect(countReviewable(pool, [])).toBe(0);
  });
});

describe('listCategories', () => {
  it('カテゴリごとの問題数を初出順で返す', () => {
    expect(listCategories(pool)).toEqual([
      { category: '時制', total: 2, wrong: 0 },
      { category: '前置詞', total: 1, wrong: 0 },
      { category: '比較', total: 1, wrong: 0 },
    ]);
  });

  it('要復習の件数をカテゴリごとに数える', () => {
    const out = listCategories(pool, ['q1', 'q4']);
    expect(out.find((c) => c.category === '時制')?.wrong).toBe(1);
    expect(out.find((c) => c.category === '前置詞')?.wrong).toBe(0);
    expect(out.find((c) => c.category === '比較')?.wrong).toBe(1);
  });
});

describe('buildQuizOrder', () => {
  it('渡した問題を過不足なく含む', () => {
    const order = buildQuizOrder(pool, () => 0.5);
    expect(order.map((q) => q.id).sort()).toEqual(['q1', 'q2', 'q3', 'q4']);
  });
});

describe('isCorrect', () => {
  it('answerIndex と一致すれば true', () => {
    expect(isCorrect(makeQuestion('q1', 'テスト', 2), 2)).toBe(true);
    expect(isCorrect(makeQuestion('q1', 'テスト', 2), 1)).toBe(false);
  });
});

describe('summarize', () => {
  it('正答率を算出する', () => {
    expect(summarize(4, 3)).toEqual({ total: 4, correct: 3, accuracy: 0.75 });
  });

  it('total 0 のとき accuracy は 0', () => {
    expect(summarize(0, 0).accuracy).toBe(0);
  });
});

describe('modeLabel', () => {
  it('モードごとの表示名を返す', () => {
    expect(modeLabel({ kind: 'all' })).toBe('全問');
    expect(modeLabel({ kind: 'review' })).toBe('復習');
    expect(modeLabel({ kind: 'category', category: '仮定法' })).toBe('仮定法');
  });
});

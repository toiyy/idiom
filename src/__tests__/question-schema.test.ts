import { describe, expect, it } from 'vitest';
import { QuestionListSchema, QuestionSchema } from '../types/question';
import { questions } from '../data/questions';
import { listCategories } from '../lib/quiz';

const valid = {
  id: 'p5-x-001',
  part: 5,
  category: '時制',
  sentence: 'She ___ here since 2019.',
  choices: ['work', 'works', 'has worked', 'working'],
  answerIndex: 2,
  explanation: 'since があるので現在完了。',
};

describe('QuestionSchema', () => {
  it('正しい問題を受理する', () => {
    expect(QuestionSchema.safeParse(valid).success).toBe(true);
  });

  it('空所 ___ がない文を弾く', () => {
    const bad = { ...valid, sentence: 'She works here.' };
    expect(QuestionSchema.safeParse(bad).success).toBe(false);
  });

  it('選択肢が 4 つでないと弾く', () => {
    const bad = { ...valid, choices: ['a', 'b', 'c'] };
    expect(QuestionSchema.safeParse(bad).success).toBe(false);
  });

  it('answerIndex が範囲外なら弾く', () => {
    const bad = { ...valid, answerIndex: 4 };
    expect(QuestionSchema.safeParse(bad).success).toBe(false);
  });

  it('未知のキーを弾く（strict）', () => {
    const bad = { ...valid, foo: 'bar' };
    expect(QuestionSchema.safeParse(bad).success).toBe(false);
  });
});

describe('QuestionListSchema', () => {
  it('id 重複を弾く', () => {
    const dup = [valid, { ...valid }];
    expect(QuestionListSchema.safeParse(dup).success).toBe(false);
  });
});

describe('同梱データ', () => {
  it('src/data/questions/*.json を読み込めている', () => {
    expect(questions.length).toBeGreaterThanOrEqual(36);
  });

  it('全問がスキーマに適合する', () => {
    const result = QuestionListSchema.safeParse(questions);
    expect(result.success).toBe(true);
  });

  it('12 カテゴリすべてに問題がある', () => {
    const categories = listCategories(questions);
    expect(categories).toHaveLength(12);
    for (const c of categories) {
      expect(c.total).toBeGreaterThanOrEqual(3);
    }
  });

  it('正解の選択肢が空文字でない', () => {
    for (const q of questions) {
      expect(q.choices[q.answerIndex]).toBeTruthy();
    }
  });

  it('選択肢に重複がない', () => {
    for (const q of questions) {
      expect(new Set(q.choices).size, `重複あり: ${q.id}`).toBe(4);
    }
  });
});

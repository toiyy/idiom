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
  translation: '彼女は 2019 年からここで働いている。',
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

  it('translation がないと弾く', () => {
    const bad: Record<string, unknown> = { ...valid };
    delete bad.translation;
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
    expect(questions.length).toBeGreaterThanOrEqual(243);
  });

  it('全問がスキーマに適合する', () => {
    const result = QuestionListSchema.safeParse(questions);
    expect(result.success).toBe(true);
  });

  it('20 カテゴリすべてに問題がある', () => {
    const categories = listCategories(questions);
    expect(categories).toHaveLength(20);
    for (const c of categories) {
      expect(c.total, `${c.category} の問題数`).toBeGreaterThanOrEqual(3);
    }
  });

  it('フェーズ3 で新設した 7 カテゴリが揃っている', () => {
    const names = listCategories(questions).map((c) => c.category);
    for (const c of [
      '助動詞',
      '冠詞・限定詞',
      '名詞節',
      '相関表現',
      '倒置・強調・省略',
      '文型・語順',
      '分詞形容詞',
    ]) {
      expect(names, `${c} が見つからない`).toContain(c);
    }
  });

  it('語彙カテゴリが 7 サブカテゴリ × 15 問を持つ', () => {
    const vocab = listCategories(questions).find((c) => c.category === '語彙');
    expect(vocab?.total).toBe(105);
    expect(vocab?.subcategories).toHaveLength(7);
    for (const s of vocab?.subcategories ?? []) {
      expect(s.total, `${s.subcategory} の問題数`).toBe(15);
    }
  });

  it('品詞識別カテゴリが 3 サブカテゴリ × 15 問を持つ', () => {
    const wf = listCategories(questions).find((c) => c.category === '品詞識別');
    expect(wf?.total).toBe(45);
    expect(wf?.subcategories.map((s) => s.subcategory)).toEqual([
      '形容詞の位置',
      '副詞の位置',
      '名詞の位置',
    ]);
    for (const s of wf?.subcategories ?? []) {
      expect(s.total).toBe(15);
    }
  });

  it('サブカテゴリを持つのは語彙と品詞識別だけ', () => {
    const nested = listCategories(questions)
      .filter((c) => c.subcategories.length > 0)
      .map((c) => c.category);
    expect(nested.sort()).toEqual(['品詞識別', '語彙']);
  });

  it('サブカテゴリ内のカテゴリ名が一貫している', () => {
    for (const q of questions) {
      if (q.subcategory === undefined) continue;
      const siblings = questions.filter((o) => o.subcategory === q.subcategory);
      const cats = new Set(siblings.map((o) => o.category));
      expect(cats.size, `${q.subcategory} が複数カテゴリに跨っている`).toBe(1);
    }
  });

  it('正解の位置が特定のインデックスに偏っていない', () => {
    const counts = [0, 0, 0, 0];
    for (const q of questions) counts[q.answerIndex] += 1;
    // 均等なら各 25%。どれも 10%〜45% の範囲に収まっていれば偏りなしとみなす
    for (const n of counts) {
      expect(n / questions.length).toBeGreaterThan(0.1);
      expect(n / questions.length).toBeLessThan(0.45);
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

  it('全問に日本語訳がある', () => {
    for (const q of questions) {
      expect(q.translation.length, `訳が短すぎる: ${q.id}`).toBeGreaterThan(5);
    }
  });
});

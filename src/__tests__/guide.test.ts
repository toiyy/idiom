import { describe, expect, it } from 'vitest';
import { GuideListSchema, GuideSchema } from '../types/guide';
import { findGuide, guides } from '../data/guides';
import { questions } from '../data/questions';

const valid = {
  category: '数量詞',
  summary: 'まず名詞が可算か不可算かを見る。',
  sections: [{ heading: '1. 可算か不可算か', body: ['名詞を先に見る。'] }],
};

describe('GuideSchema', () => {
  it('正しい解説を受理する', () => {
    expect(GuideSchema.safeParse(valid).success).toBe(true);
  });

  it('未知のキーを弾く（strict）', () => {
    expect(GuideSchema.safeParse({ ...valid, foo: 1 }).success).toBe(false);
  });

  it('節がひとつもなければ弾く', () => {
    expect(GuideSchema.safeParse({ ...valid, sections: [] }).success).toBe(false);
  });

  it('中身のない節を弾く', () => {
    const bad = { ...valid, sections: [{ heading: '見出しだけ' }] };
    expect(GuideSchema.safeParse(bad).success).toBe(false);
  });

  it('表の列数が見出しと合わなければ弾く', () => {
    const bad = {
      ...valid,
      sections: [{ heading: '表', table: { headers: ['a', 'b'], rows: [['1', '2', '3']] } }],
    };
    expect(GuideSchema.safeParse(bad).success).toBe(false);
  });

  it('カテゴリの重複を弾く', () => {
    expect(GuideListSchema.safeParse([valid, { ...valid }]).success).toBe(false);
  });
});

describe('同梱データ', () => {
  it('src/data/guides/*.json を読み込めている', () => {
    expect(guides.length).toBeGreaterThanOrEqual(1);
  });

  it('解説のカテゴリが実在する', () => {
    const known = new Set(questions.map((q) => q.category));
    for (const g of guides) {
      expect(known, `${g.category} というカテゴリはない`).toContain(g.category);
    }
  });

  it('findGuide でカテゴリ名から引ける', () => {
    for (const g of guides) expect(findGuide(g.category)).toBe(g);
    expect(findGuide('存在しないカテゴリ')).toBeUndefined();
  });

  it('数量詞の解説が表と例文を備えている', () => {
    const g = findGuide('数量詞');
    expect(g).toBeDefined();
    expect(g!.sections.filter((s) => s.table).length).toBeGreaterThanOrEqual(3);
    expect(g!.sections.flatMap((s) => s.examples ?? []).length).toBeGreaterThanOrEqual(10);
  });

  it('例文に空所が残っていない', () => {
    for (const g of guides) {
      for (const ex of g.sections.flatMap((s) => s.examples ?? [])) {
        expect(ex.en, `${g.category}: 空所が残っている`).not.toContain('___');
      }
    }
  });

  it('節の見出しが重複していない', () => {
    for (const g of guides) {
      const headings = g.sections.map((s) => s.heading);
      expect(new Set(headings).size, `${g.category}: 見出しが重複`).toBe(headings.length);
    }
  });
});

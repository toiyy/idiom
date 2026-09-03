import { describe, expect, it } from 'vitest';
import { GuideListSchema, GuideSchema } from '../types/guide';
import { findGuide, guides } from '../data/guides';
import { questions } from '../data/questions';

const valid = {
  category: '数量詞',
  summary: 'まず名詞が可算か不可算かを見る。',
  sections: [
    { heading: '1. 可算か不可算か', point: '名詞を先に見る。', body: ['後ろの名詞で決まる。'] },
  ],
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

  it('常に表示する中身がない節を弾く', () => {
    const bad = { ...valid, sections: [{ heading: '見出し', body: ['本文'] }] };
    expect(GuideSchema.safeParse(bad).success).toBe(false);
  });

  it('要点がなくても対比リストがあれば受理する', () => {
    const ok = {
      ...valid,
      sections: [
        {
          heading: '見出し',
          columns: [{ title: '不可算', tone: 'ng', items: ['information'] }],
          body: ['本文'],
        },
      ],
    };
    expect(GuideSchema.safeParse(ok).success).toBe(true);
  });

  it('中身が空の列を弾く', () => {
    const bad = {
      ...valid,
      sections: [{ heading: '見出し', columns: [{ title: '不可算', items: [] }], body: ['本文'] }],
    };
    expect(GuideSchema.safeParse(bad).success).toBe(false);
  });

  it('展開する中身のない節を弾く', () => {
    const bad = { ...valid, sections: [{ heading: '見出し', point: '要点' }] };
    expect(GuideSchema.safeParse(bad).success).toBe(false);
  });

  it('表の列数が見出しと合わなければ弾く', () => {
    const bad = {
      ...valid,
      sections: [
        { heading: '表', point: '要点', table: { headers: ['a', 'b'], rows: [['1', '2', '3']] } },
      ],
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

  it('要点は一目で読める長さに収まっている', () => {
    for (const g of guides) {
      for (const s of g.sections) {
        if (s.point === undefined) continue;
        expect(s.point.length, `${g.category} / ${s.heading} の要点が長い`).toBeLessThanOrEqual(
          120,
        );
      }
    }
  });

  it('列の項目は一目で追える短さに収まっている', () => {
    // 説明や例文を項目に混ぜると列が重くなって読めなくなるので、短さで縛る
    for (const g of guides) {
      for (const s of g.sections) {
        for (const c of s.columns ?? []) {
          for (const item of c.items) {
            expect(
              item.length,
              `${g.category} / ${c.title} の「${item}」が長い`,
            ).toBeLessThanOrEqual(40);
          }
        }
      }
    }
  });

  it('列の項目に全角空白でのぶら下げがない', () => {
    for (const g of guides) {
      for (const c of g.sections.flatMap((s) => s.columns ?? [])) {
        for (const item of c.items) {
          expect(item, `${g.category} / ${c.title}`).not.toContain('　');
        }
      }
    }
  });

  it('節の見出しの番号が 1 から通しで振られている', () => {
    // 節をまとめたときに番号の振り直し漏れがあると読み手が混乱する
    for (const g of guides) {
      g.sections.forEach((s, i) => {
        expect(s.heading, `${g.category} の ${i + 1} 番目`).toMatch(new RegExp(`^${i + 1}\\.`));
      });
    }
  });

  it('節の見出しが重複していない', () => {
    for (const g of guides) {
      const headings = g.sections.map((s) => s.heading);
      expect(new Set(headings).size, `${g.category}: 見出しが重複`).toBe(headings.length);
    }
  });
});

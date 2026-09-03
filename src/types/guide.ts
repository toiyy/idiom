import { z } from 'zod';

/**
 * カテゴリごとの解説。参考書の 1 章にあたる読み物で、問題とは独立に持つ。
 * 問題データと同じく JSON を置くだけで増やせる。
 */

const ExampleSchema = z
  .object({
    /** 完成した英文。空所は含めない。 */
    en: z.string().min(1),
    ja: z.string().min(1),
    /** ✓ 正しい / ✗ 誤り。省略時は中立の例文として扱う。 */
    ok: z.boolean().optional(),
    note: z.string().min(1).optional(),
  })
  .strict();

const TableSchema = z
  .object({
    headers: z.array(z.string().min(1)).min(2),
    rows: z.array(z.array(z.string()).min(2)).min(1),
  })
  .strict()
  .superRefine((t, ctx) => {
    for (const [i, row] of t.rows.entries()) {
      if (row.length !== t.headers.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${i + 1} 行目の列数が見出しと合いません`,
        });
      }
    }
  });

const SectionSchema = z
  .object({
    heading: z.string().min(1),
    /** 段落。1 要素 1 段落。 */
    body: z.array(z.string().min(1)).optional(),
    table: TableSchema.optional(),
    examples: z.array(ExampleSchema).optional(),
    /** 落とし穴。節の最後に目立つ形で出す。 */
    pitfall: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((s, ctx) => {
    if (!s.body && !s.table && !s.examples && !s.pitfall) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: '中身のない節です' });
    }
  });

export const GuideSchema = z
  .object({
    /** 対応するカテゴリ名。問題データの category と一致させる。 */
    category: z.string().min(1),
    /** 冒頭の要約。このカテゴリで何が問われるかを 1〜2 文で。 */
    summary: z.string().min(1),
    sections: z.array(SectionSchema).min(1),
  })
  .strict();

export const GuideListSchema = z.array(GuideSchema).superRefine((guides, ctx) => {
  const seen = new Set<string>();
  for (const g of guides) {
    if (seen.has(g.category)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `カテゴリが重複: ${g.category}` });
    }
    seen.add(g.category);
  }
});

export type Guide = z.infer<typeof GuideSchema>;
export type GuideSection = z.infer<typeof SectionSchema>;

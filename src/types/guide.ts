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

/**
 * 常に表示する対比ブロックの 1 列。
 * 「可算につく語 / 不可算につく語」のように、覚える単位を列に分けて一目で見比べる。
 */
const ColumnSchema = z
  .object({
    title: z.string().min(1),
    /** 見出しの色。ok = 正しい形、ng = 誤った形。省略時は中立。 */
    tone: z.union([z.literal('ok'), z.literal('ng')]).optional(),
    items: z.array(z.string().min(1)).min(1),
  })
  .strict();

const SectionSchema = z
  .object({
    heading: z.string().min(1),
    /**
     * 一目で覚える要点。常に表示するので、これだけ読めば復習になる 1〜2 文にする。
     */
    point: z.string().min(1).optional(),
    /** 常に表示する対比リスト。暗記の核はここに置く。 */
    columns: z.array(ColumnSchema).min(1).optional(),
    /** 以下は「詳しく」を開いたときだけ出す。 */
    body: z.array(z.string().min(1)).optional(),
    table: TableSchema.optional(),
    examples: z.array(ExampleSchema).optional(),
    /** 落とし穴。節の最後に目立つ形で出す。 */
    pitfall: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((s, ctx) => {
    if (!s.point && !s.columns) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: '常に表示する中身がない節です' });
    }
    if (!s.body && !s.table && !s.examples && !s.pitfall) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: '展開する中身のない節です' });
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

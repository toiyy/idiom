import { z } from 'zod';

/**
 * TOEIC 四択文法問題の 1 問を表すスキーマ。
 * 問題データ（src/data/questions.sample.json 等）はすべてこの形に従う。
 */
export const QuestionSchema = z
  .object({
    /** 一意な ID。ファイル内・全体で重複しないこと。例: "p5-tense-001" */
    id: z.string().min(1),
    /** TOEIC の Part。文法問題は Part 5（短文穴埋め）/ Part 6（長文穴埋め）。 */
    part: z.union([z.literal(5), z.literal(6)]),
    /** 文法カテゴリ。例: "時制", "前置詞", "関係代名詞", "態", "接続詞" */
    category: z.string().min(1),
    /** 問題文。空所は "___"（半角アンダースコア3つ）で表記する。 */
    sentence: z.string().min(1).includes('___'),
    /** 選択肢。必ず 4 つ。 */
    choices: z.tuple([z.string().min(1), z.string().min(1), z.string().min(1), z.string().min(1)]),
    /** 正解の choices インデックス（0〜3）。 */
    answerIndex: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
    /** 日本語の解説。 */
    explanation: z.string().min(1),
    /** 難易度（任意）。1=易 / 2=中 / 3=難 */
    difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
    /** 自由タグ（任意）。復習フィルタ等に使う。 */
    tags: z.array(z.string().min(1)).optional(),
  })
  .strict();

export type Question = z.infer<typeof QuestionSchema>;

export const QuestionListSchema = z.array(QuestionSchema).superRefine((questions, ctx) => {
  const seen = new Set<string>();
  questions.forEach((q, i) => {
    if (seen.has(q.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `id が重複しています: ${q.id}`,
        path: [i, 'id'],
      });
    }
    seen.add(q.id);
  });
});

export type QuestionList = z.infer<typeof QuestionListSchema>;

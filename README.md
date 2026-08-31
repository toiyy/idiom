# idiom — TOEIC 文法トレーナー

TOEIC の 4 択文法問題（Part 5 / 6）を個人学習するための web アプリ。
バックエンドなし・完全クライアントサイド。進捗は localStorage に保存。

## 技術スタック

| 領域       | 採用                                                       |
| ---------- | ---------------------------------------------------------- |
| ビルド     | Vite 6                                                     |
| UI         | React 18 + TypeScript                                      |
| 問題データ | リポジトリ内 JSON（Zod でスキーマ検証）                    |
| 進捗保存   | localStorage                                               |
| テスト     | Vitest + Testing Library                                   |
| 静的解析   | ESLint (flat config) + Prettier                            |
| CI         | GitHub Actions（typecheck / lint / format / test / build） |

## セットアップ

```bash
npm install
npm run dev        # 開発サーバ（http://localhost:5173）
```

## npm スクリプト

| コマンド               | 内容                               |
| ---------------------- | ---------------------------------- |
| `npm run dev`          | 開発サーバ起動                     |
| `npm run build`        | 型チェック + 本番ビルド（`dist/`） |
| `npm run preview`      | ビルド結果をローカル確認           |
| `npm test`             | テストを 1 回実行                  |
| `npm run test:watch`   | テストを watch 実行                |
| `npm run lint`         | ESLint                             |
| `npm run format`       | Prettier で整形                    |
| `npm run format:check` | 整形差分チェック（CI 用）          |
| `npm run typecheck`    | 型チェックのみ                     |

## 学習モード

ホーム画面で 3 つのモードから選ぶ。

| モード         | 内容                                                         |
| -------------- | ------------------------------------------------------------ |
| 全問           | 全カテゴリからシャッフル出題                                 |
| 復習           | 過去に間違えた問題だけを出題。正解すると復習リストから外れる |
| カテゴリ別     | カテゴリを 1 つ選んで集中演習                                |
| サブカテゴリ別 | 語彙のように細分化されたカテゴリは、さらに絞り込める         |

復習対象（`wrongIds`）は localStorage に保存され、ブラウザを閉じても残る。
カテゴリごとの要復習数もホーム画面に表示される。

## 問題データの追加

問題は `src/data/questions/` 配下の JSON に置くだけでよい。
Vite の glob import で自動的に読み込まれ、起動時に `src/types/question.ts` の
Zod スキーマで一括検証される（不備があれば起動時に例外）。**コードの変更は不要。**

1. `src/data/questions/<カテゴリ名>.json` を新規作成し、下記スキーマの配列を書く
2. `npm test` でスキーマ検証（`question-schema.test.ts`）が通ることを確認

現在の同梱データ: **13 カテゴリ / 71 問**（すべて Part 5 形式）。

文法 12 カテゴリ × 3 問 = 36 問:

```
tense / voice / verbals / relatives / conjunction-preposition / prepositions
pronouns / word-form / comparison / subjunctive / agreement / quantifiers
```

語彙 1 カテゴリ × 7 サブカテゴリ × 5 問 = 35 問:

```
vocabulary-verb-preposition   動詞＋前置詞（adhere to / dispose of …）
vocabulary-adj-preposition    形容詞＋前置詞（consistent with / subject to …）
vocabulary-collocation        コロケーション（meet a deadline / take effect …）
vocabulary-phrasal-verb       句動詞（put off / roll out …）
vocabulary-confusables        紛らわしい類義語（efficient vs effective …）
vocabulary-noun               名詞の語彙（scheduling conflict / refund …）
vocabulary-connectives        接続副詞（however / therefore …）
```

語彙が全体の約半分を占めるのは意図的です。実際の Part 5 でも語彙・品詞の比重が
大きく、サブカテゴリを 1 段挟むことでホーム画面を増やさずに配分を厚くしています。

### サブカテゴリ

`subcategory` は**任意**のフィールドで、分量が多く細分化したいカテゴリだけが持ちます。
語彙以外（時制など）は付けないため、ホーム画面ではフラットなボタンとして並びます。
将来 `品詞識別` を「名詞の位置 / 形容詞の位置 / 副詞の位置」に割りたくなったときも、
同じ仕組みで分割できます。

### 1 問のスキーマ

```jsonc
{
  "id": "p5-tense-001", // 一意。重複するとバリデーションエラー
  "part": 5, // 5 | 6
  "category": "時制", // 自由文字列（例: 前置詞 / 関係詞 / 態 / 語彙）
  "subcategory": "句動詞", // 任意。付けたカテゴリだけ 2 段表示になる
  "sentence": "By the time ..., the team ___ the reports.", // 空所は "___"
  "choices": ["a", "b", "c", "d"], // 必ず 4 つ
  "answerIndex": 1, // 0..3
  "explanation": "日本語の解説",
  "difficulty": 2, // 任意: 1 | 2 | 3
  "tags": ["未来完了"], // 任意
}
```

## 実装済み / 未実装

実装済み:

- 4 モード（全問 / 復習 / カテゴリ別 / サブカテゴリ別）のシャッフル出題
- 4 択選択 → 正誤判定 → 解説表示 → 次へ
- セッション正答率、累計正答率の保存・表示、要復習リストの自動更新
- 途中中断してホームに戻る

未実装:

- SRS（間隔反復スケジューリング）
- 難易度 / タグによる絞り込み
- Part 6（長文穴埋め）形式の出題

## ディレクトリ

```
src/
├── types/question.ts      # Zod スキーマ + 型
├── data/
│   ├── questions/         # 問題 JSON（カテゴリごとに 1 ファイル）
│   └── questions.ts       # glob import ローダー + 起動時検証
├── lib/
│   ├── quiz.ts            # モード絞り込み・シャッフル・集計（純粋関数）
│   └── storage.ts         # localStorage ラッパ
├── components/            # HomeScreen / QuestionCard / ChoiceButton / ResultView
├── __tests__/             # Vitest（57 tests）
└── App.tsx                # home / quiz / result の画面遷移
```

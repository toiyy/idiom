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

| モード     | 内容                                                         |
| ---------- | ------------------------------------------------------------ |
| 全問       | 全カテゴリからシャッフル出題                                 |
| 復習       | 過去に間違えた問題だけを出題。正解すると復習リストから外れる |
| カテゴリ別 | カテゴリを 1 つ選んで集中演習                                |

復習対象（`wrongIds`）は localStorage に保存され、ブラウザを閉じても残る。
カテゴリごとの要復習数もホーム画面に表示される。

## 問題データの追加

問題は `src/data/questions/` 配下の JSON に置くだけでよい。
Vite の glob import で自動的に読み込まれ、起動時に `src/types/question.ts` の
Zod スキーマで一括検証される（不備があれば起動時に例外）。**コードの変更は不要。**

1. `src/data/questions/<カテゴリ名>.json` を新規作成し、下記スキーマの配列を書く
2. `npm test` でスキーマ検証（`question-schema.test.ts`）が通ることを確認

現在の同梱データ: **12 カテゴリ × 3 問 = 36 問**（すべて Part 5 形式）。

```
tense / voice / verbals / relatives / conjunction-preposition / prepositions
pronouns / word-form / comparison / subjunctive / agreement / quantifiers
```

### 1 問のスキーマ

```jsonc
{
  "id": "p5-tense-001", // 一意。重複するとバリデーションエラー
  "part": 5, // 5 | 6
  "category": "時制", // 自由文字列（例: 前置詞 / 関係代名詞 / 態 / 接続詞）
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

- 3 モード（全問 / 復習 / カテゴリ別）のシャッフル出題
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
├── __tests__/             # Vitest（45 tests）
└── App.tsx                # home / quiz / result の画面遷移
```

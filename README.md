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

## 学習の再開

解きかけのセッション（モード・出題順・何問目か・選んだ選択肢・自信度）を
localStorage に保存しているので、タブを閉じても続きから戻れる。

| 離れ方                         | 次に開いたとき                         |
| ------------------------------ | -------------------------------------- |
| タブを閉じた / アプリを離れた  | **そのまま自動で再開**する             |
| 「中断」ボタンでホームに戻った | ホームに「続きから」が出る。押せば再開 |

自分で中断したときだけホームに留まるのは、別のカテゴリをやりたくて中断した場合に
自動再開が邪魔になるため。最後まで解き切れば保存内容は消える。

出題順は問題そのものではなく **id で保存**している。問題データを編集して id が
消えた場合は、中途半端に出題内容がずれるより安全なのでセッションごと破棄する
（累計や復習リストには影響しない）。

## 自信度の記録

満点を狙ううえで一番の敵は「勘で当たった問題」なので、**正誤を表示する前に**
自信度を自己申告させる。結果を知る前に答えるため、自己申告が歪まない。

```
選択肢をクリック  →  自信度を選ぶ（1〜3 キーでも可）  →  正誤 / 日本語訳 / 解説
```

回答後は**不正解 3 つそれぞれの下に「なぜ違うか」が出る**。正解の理由は解説に
まとめてあるので、正解の選択肢には付けない。4 択で 1 つを選べても、
残り 3 つを切れる理由まで言えないと本番では落とすため。

| 自信度      | 結果   | 復習リスト |
| ----------- | ------ | ---------- |
| 自信あり    | 正解   | **外れる** |
| 自信あり    | 不正解 | 残る       |
| 迷った      | 正解   | 残る       |
| 勘          | 正解   | 残る       |
| 迷った / 勘 | 不正解 | 残る       |

つまり **「自信ありで正解」だけが習得済み**（`isMastered()`）。見かけの正答率が
上がっても、確信のない正解は未習得として復習に回る。

ホーム画面と結果画面に自信度別の正答率が表で出る。「確信なしで正解した数」は
見かけの正答率と実力の差なので、そこが減っていくのが上達の指標になる。

## 問題データの追加

問題は `src/data/questions/` 配下の JSON に置くだけでよい。
Vite の glob import で自動的に読み込まれ、起動時に `src/types/question.ts` の
Zod スキーマで一括検証される（不備があれば起動時に例外）。**コードの変更は不要。**

1. `src/data/questions/<カテゴリ名>.json` を新規作成し、下記スキーマの配列を書く
2. `npm test` でスキーマ検証（`question-schema.test.ts`）が通ることを確認

現在の同梱データ: **20 カテゴリ / 333 問**（すべて Part 5 形式）。各カテゴリ 8 問以上。

品詞識別 1 カテゴリ × 3 サブカテゴリ × 15 問 = 45 問:

```
word-form-noun        名詞の位置（the ___ of / 所有格の後 / 目的語 …）
word-form-adjective   形容詞の位置（冠詞+___+名詞 / remain・seem の補語 …）
word-form-adverb      副詞の位置（助動詞+___+動詞 / be+___+過去分詞 …）
```

品詞識別が最も厚いのは、本番の Part 5 でこの型が最頻出（30 問中 8〜10 問が目安）
だからです。位置さえ見れば意味を知らなくても解けるので、確実に取り切りたい領域。

準動詞 1 カテゴリ × 3 サブカテゴリ = 24 問 / 関係詞 1 カテゴリ × 2 サブカテゴリ = 15 問:

```
verbals-infinitive     不定詞（目的 / easy to do / too ... to / enough to …）
verbals-gerund         動名詞（avoid / finish / look forward to / be worth …）
verbals-participle     分詞（後置修飾 / 分詞構文 / compared with …）
relatives-pronoun      関係代名詞（who / whom / whose / 前置詞+which / 非制限用法 …）
relatives-adverb       関係副詞（where / when / why / how / wherever / however …）
```

文法 16 カテゴリ = 144 問:

```
# 初期からあるカテゴリ（各 9〜10 問）
tense / voice / conjunction-preposition / prepositions
pronouns / comparison / subjunctive / agreement / quantifiers

# フェーズ3 で新設した 7 カテゴリ（各 8〜10 問）
modals                  助動詞（must have / should have / used to vs be used to …）
articles                冠詞・限定詞（a university / an hour / most of / none of …）
noun-clauses            名詞節（whether vs if / 同格の that / 先行詞を含む what …）
correlatives            相関表現（not only ... but also / so ... that / such ... that …）
inversion               倒置・強調・省略（Never before has / Should you / Enclosed is …）
sentence-patterns       文型・語順（keep O C / make O 原形 / have O p.p. / there 構文 …）
participial-adjectives  分詞形容詞（inspiring vs inspired / confusing vs confused …）
```

この 7 カテゴリは初期の 12 分類から漏れていた論点です。これで Part 5 の
文法項目はひととおり網羅できました。

語彙 1 カテゴリ × 7 サブカテゴリ × 15 問 = 105 問:

```
vocabulary-verb-preposition   動詞＋前置詞（adhere to / account for / consist of …）
vocabulary-adj-preposition    形容詞＋前置詞（consistent with / subject to / short of …）
vocabulary-collocation        コロケーション（meet a deadline / place an order …）
vocabulary-phrasal-verb       句動詞（put off / carry out / come up with …）
vocabulary-confusables        紛らわしい類義語（efficient vs effective / ensure vs assure …）
vocabulary-noun               名詞の語彙（scheduling conflict / turnout vs turnover …）
vocabulary-connectives        接続副詞（however / nevertheless / accordingly …）
```

語彙問題は「選択肢が同じ品詞の別単語」なので、文法のようにルールで消去法が使えず、
知らなければ 1/4 の運になる。ここが 950 → 990 の壁になりやすいため厚くしてある。

品詞識別と語彙で全体の 7 割を占めるのは意図的です。実際の Part 5 でもこの 2 つが
出題の大半を占めるため、サブカテゴリを 1 段挟むことでホーム画面のボタンを増やさずに
配分を厚くしています。

### サブカテゴリ

`subcategory` は**任意**のフィールドで、分量が多く細分化したいカテゴリだけが持ちます。
現在は `語彙`（7 分割）/ `品詞識別`（3 分割）/ `準動詞`（3 分割）/ `関係詞`（2 分割）の
4 カテゴリ。時制などの残り 16 カテゴリは付けないため、ホーム画面ではフラットな
ボタンとして並びます。問題が増えたカテゴリは、いつでも同じ仕組みで後から分割できます。

### 問題数の目標

現在 333 問。反復で答えを覚えてしまわないための目安である **280 問**（1 日 20 問
ペースで 2 週間空けられる量）は超えた。完成形は約 370 問を想定している。

| フェーズ | 内容                                                                                                                | 状態            |
| -------- | ------------------------------------------------------------------------------------------------------------------- | --------------- |
| 1        | 品詞識別を 3 分割 × 15 問                                                                                           | **完了**（+45） |
| 2        | 語彙 7 サブカテゴリを各 15 問に                                                                                     | **完了**（+70） |
| 3        | 未カバー 7 カテゴリを新設（助動詞 / 冠詞・限定詞 / 名詞節 / 相関表現 / 倒置・強調・省略 / 文型・語順 / 分詞形容詞） | **完了**（+60） |
| 4        | 既存文法カテゴリの厚み増し、準動詞・関係詞の分割                                                                    | **完了**（+90） |
| 5        | 難問（もっともらしい 2 択に絞られる問題）                                                                           | 未着手（+35）   |

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
  "translation": "空所に正解を入れた英文全体の日本語訳", // 必須
  // 不正解 3 つの「なぜ違うか」。必須。選択肢の文字列をキーにするので
  // 並べ替えても対応が壊れない。正解の選択肢に付けるのは任意
  "choiceNotes": {
    "completes": "現在形。完了しているという意味が出ない",
    "completed": "過去形。未来の話なので合わない",
    "has completed": "現在完了。未来の時点までの完了は表せない",
  },
  "difficulty": 2, // 任意: 1 | 2 | 3
  "tags": ["未来完了"], // 任意
}
```

## 実装済み / 未実装

実装済み:

- 4 モード（全問 / 復習 / カテゴリ別 / サブカテゴリ別）のシャッフル出題
- 4 択選択 → 自信度の申告 → 正誤判定 → 日本語訳 → 解説 → 次へ
- 不正解 3 つそれぞれに「なぜ違うか」を選択肢の下へインライン表示
- 自信度別の正答率集計と、「確信なしで正解した数」の可視化
- セッション正答率、累計正答率の保存・表示、要復習リストの自動更新
- 途中中断してホームに戻る（「続きから」で再開）
- タブを閉じても解きかけの問題から自動再開

未実装:

- 解答時間の記録（Part 5 は 1 問 20 秒が目安）
- 問題の手入力フォーム（公式問題集で間違えた問題を溜める運用）
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
│   ├── storage.ts         # localStorage ラッパ・自信度と復習判定
│   └── session.ts         # 解きかけセッションの保存・復元
├── components/            # HomeScreen / QuestionCard / ChoiceButton /
│                          # ConfidenceTable / ResultView
├── __tests__/             # Vitest（107 tests）
└── App.tsx                # home / quiz / result の画面遷移
```

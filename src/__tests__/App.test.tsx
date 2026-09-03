import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { questions } from '../data/questions';
import { parseBackup } from '../lib/backup';
import { guides } from '../data/guides';

type User = ReturnType<typeof userEvent.setup>;
type Label = '自信あり' | '迷った' | '勘';

/** 画面に出ている選択肢ボタン（表示順 = choices の順）。 */
function choiceButtons(): HTMLButtonElement[] {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('.choice'));
}

/** 表示中の英文から、いま出題されている問題を特定する。
 *  is / are / be / being のように選択肢が完全に一致する問題どうしがあるため、英文で照合する。
 *  回答後は空所が正解で埋まって表示されるので、両方の形と突き合わせる。 */
function currentQuestion() {
  const sentence = document.querySelector('.card__sentence')?.textContent ?? '';
  const found = questions.find(
    (q) =>
      q.sentence === sentence || q.sentence.replace('___', q.choices[q.answerIndex]) === sentence,
  );
  if (!found) throw new Error(`出題中の問題を特定できませんでした: ${sentence}`);
  return found;
}

/** 選択 → 自信度 → 次へ、の 1 問ぶんを進める。 */
async function answer(user: User, opts: { correct: boolean; confidence: Label }) {
  const q = currentQuestion();
  const pick = opts.correct ? q.answerIndex : (q.answerIndex + 1) % 4;
  await user.click(choiceButtons()[pick]);
  await user.click(screen.getByRole('button', { name: new RegExp(opts.confidence) }));
  await user.click(screen.getByRole('button', { name: /次の問題へ|結果を見る/ }));
}

/** 出題中セッションの総問題数（「1 / 6」の 6）。問題を増やしてもテストが壊れないよう画面から読む。 */
function sessionTotal(): number {
  const text = document.querySelector('.card__meta span')?.textContent ?? '';
  const total = Number(text.split('/')[1]?.trim());
  if (!Number.isFinite(total)) throw new Error(`問題数を読み取れませんでした: "${text}"`);
  return total;
}

/** セッションを最後まで解き切る。plan(i) が i 問目の解き方を返す。 */
async function answerAll(user: User, plan: (i: number) => { correct: boolean; confidence: Label }) {
  const total = sessionTotal();
  for (let i = 0; i < total; i++) await answer(user, plan(i));
  return total;
}

/** 問題数が最も少ないカテゴリ。セッション全体を解き切るテストを短く保つために使う。 */
const SHORT = { name: /^構造の取り違え/, label: /^難問 \/ 構造の取り違え/, size: 11 };

beforeEach(() => {
  localStorage.clear();
});

describe('ホーム画面', () => {
  it('全問モードに総問題数が出る', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /^全問/ })).toHaveTextContent(
      `${questions.length} 問`,
    );
  });

  it('間違えた問題がなければ復習モードは無効', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /^復習/ })).toBeDisabled();
  });

  it('サブカテゴリを持たない 16 カテゴリがフラットに並ぶ', () => {
    render(<App />);
    const flatGrid = document.querySelector('.card .category-list');
    expect(flatGrid?.querySelectorAll('.category')).toHaveLength(16);
  });

  it('5 カテゴリが 2 段グループになる', () => {
    render(<App />);
    const groups = Array.from(document.querySelectorAll('.category-group'));
    // 並びは問題ファイル名順（hard-* → relatives-* → verbals-* → vocabulary-* → word-form-*）
    const names = groups.map((g) => g.querySelector('.category-group__name')?.textContent);
    expect(names).toEqual(['難問', '関係詞', '準動詞', '語彙', '品詞識別']);
    expect(groups[0].querySelectorAll('.category')).toHaveLength(3);
    expect(groups[1].querySelectorAll('.category')).toHaveLength(2);
    expect(groups[2].querySelectorAll('.category')).toHaveLength(3);
    expect(groups[3].querySelectorAll('.category')).toHaveLength(7);
    expect(groups[4].querySelectorAll('.category')).toHaveLength(3);
  });
});

describe('サブカテゴリ出題', () => {
  it('サブカテゴリを選ぶとその 15 問だけが出る', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^句動詞/ }));
    expect(screen.getByText('1 / 15')).toBeInTheDocument();
    expect(screen.getByText('語彙 / 句動詞')).toBeInTheDocument();
  });

  it('語彙の「すべて」を選ぶと 105 問が出る', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^語彙/ }));
    expect(screen.getByText('1 / 105')).toBeInTheDocument();
  });

  it('品詞識別の「すべて」を選ぶと 45 問が出る', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^品詞識別/ }));
    expect(screen.getByText('1 / 45')).toBeInTheDocument();
  });

  it('副詞の位置を選ぶとその 15 問だけが出る', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^副詞の位置/ }));
    expect(screen.getByText('1 / 15')).toBeInTheDocument();
    expect(screen.getByText('品詞識別 / 副詞の位置')).toBeInTheDocument();
  });
});

describe('自信度の申告', () => {
  it('選択肢を選んだ時点では正誤を伏せたままにする', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^時制/ }));

    await user.click(choiceButtons()[0]);
    expect(screen.getByText('どのくらい自信がありますか？')).toBeInTheDocument();
    expect(screen.queryByText('正解')).not.toBeInTheDocument();
    expect(screen.queryByText('不正解')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /次の問題へ/ })).not.toBeInTheDocument();
  });

  it('自信度を選ぶと正誤と日本語訳が出る', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^時制/ }));

    const q = currentQuestion();
    await user.click(choiceButtons()[q.answerIndex]);
    await user.click(screen.getByRole('button', { name: /自信あり/ }));

    expect(screen.getByText('正解')).toBeInTheDocument();
    expect(screen.getByText(q.translation)).toBeInTheDocument();
    expect(screen.getByText(q.explanation)).toBeInTheDocument();
  });

  it('1〜3 キーでも自信度を選べる', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^時制/ }));

    const q = currentQuestion();
    await user.click(choiceButtons()[q.answerIndex]);
    await user.keyboard('1');

    expect(screen.getByText('正解')).toBeInTheDocument();
    expect(screen.getByText('自信あり')).toBeInTheDocument();
  });
});

describe('復習リストの判定', () => {
  it('自信ありで正解した問題は復習対象にならない', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: SHORT.name }));

    const n = await answerAll(user, () => ({ correct: true, confidence: '自信あり' }));

    expect(document.querySelector('.result__score')).toHaveTextContent(`${n} / ${n}`);
    expect(screen.getByRole('button', { name: '復習する（0）' })).toBeDisabled();
  });

  it('勘や迷いで正解した問題は復習対象に残る', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: SHORT.name }));

    // 最初の 2 問だけ確信なし、残りは自信ありで、いずれも正解する
    const n = await answerAll(user, (i) => ({
      correct: true,
      confidence: i === 0 ? '勘' : i === 1 ? '迷った' : '自信あり',
    }));

    // 全問正解でも、確信のない 2 問は復習に残る
    expect(document.querySelector('.result__score')).toHaveTextContent(`${n} / ${n}`);
    expect(screen.getByRole('button', { name: '復習する（2）' })).toBeEnabled();
  });

  it('誤答した問題が復習モードで再出題される', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: SHORT.name }));

    const n = await answerAll(user, () => ({ correct: false, confidence: '勘' }));

    expect(document.querySelector('.result__score')).toHaveTextContent(`0 / ${n}`);
    await user.click(screen.getByRole('button', { name: `復習する（${n}）` }));
    expect(screen.getByText(`1 / ${n}`)).toBeInTheDocument();
    expect(screen.getByText('復習')).toBeInTheDocument();
  });

  it('復習で自信ありで正解すると復習対象が空になる', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: SHORT.name }));

    // 1 問目だけ落とし、残りは自信ありで正解する
    await answerAll(user, (i) => ({ correct: i !== 0, confidence: i === 0 ? '勘' : '自信あり' }));

    await user.click(screen.getByRole('button', { name: '復習する（1）' }));
    expect(screen.getByText('1 / 1')).toBeInTheDocument();

    await answer(user, { correct: true, confidence: '自信あり' });
    expect(screen.getByRole('button', { name: '復習する（0）' })).toBeDisabled();
  });
});

describe('自信度の集計', () => {
  it('結果画面に自信度ごとの正答率が出る', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: SHORT.name }));

    // 迷った 1/2、勘 1/2 と解き、残りはすべて自信ありで正解する。
    // 問題数が変わってもこの比率が保たれるよう、先頭だけ指定して残りは埋める
    const head: { correct: boolean; confidence: Label }[] = [
      { correct: true, confidence: '迷った' },
      { correct: false, confidence: '迷った' },
      { correct: true, confidence: '勘' },
      { correct: false, confidence: '勘' },
    ];
    expect(sessionTotal()).toBeGreaterThan(head.length);
    await answerAll(user, (i) => head[i] ?? { correct: true, confidence: '自信あり' });

    const rows = document.querySelectorAll('.conf-table tbody tr');
    expect(rows[0]).toHaveTextContent('自信あり');
    expect(rows[0]).toHaveTextContent('100%');
    expect(rows[1]).toHaveTextContent('迷った');
    expect(rows[1]).toHaveTextContent('50%');
    expect(rows[2]).toHaveTextContent('勘');
    expect(rows[2]).toHaveTextContent('50%');
    // 確信なしで正解した 2 問（迷った 1 + 勘 1）が注記に出る
    expect(document.querySelector('.conf-table__note')).toHaveTextContent('2 問');
  });
});

describe('進捗の永続化', () => {
  it('累計と自信度の内訳が再マウント後も残る', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    await user.click(screen.getByRole('button', { name: /^時制/ }));
    const q = currentQuestion();
    await user.click(choiceButtons()[(q.answerIndex + 1) % 4]);
    await user.click(screen.getByRole('button', { name: /勘/ }));
    await user.click(screen.getByRole('button', { name: '中断' }));
    unmount();

    render(<App />);
    expect(screen.getByRole('button', { name: /^復習/ })).toBeEnabled();
    expect(document.querySelector('.result__score')).toHaveTextContent('0 / 1');
    expect(document.querySelectorAll('.conf-table tbody tr')[2]).toHaveTextContent('勘');
  });
});

describe('学習の再開', () => {
  it('クイズ中に離れると次回そのまま再開する', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    await user.click(screen.getByRole('button', { name: SHORT.name }));
    await answer(user, { correct: true, confidence: '自信あり' });
    await answer(user, { correct: true, confidence: '自信あり' });
    expect(screen.getByText(`3 / ${SHORT.size}`)).toBeInTheDocument();

    // 中断ボタンを押さずにタブを閉じた状況
    unmount();
    render(<App />);

    // ホームを経由せず 3 問目から続く
    expect(screen.getByText(`3 / ${SHORT.size}`)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^全問/ })).not.toBeInTheDocument();
  });

  it('選択肢を選んだ直後に離れても、自信度の申告から続く', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    await user.click(screen.getByRole('button', { name: SHORT.name }));
    await user.click(choiceButtons()[0]);
    unmount();

    render(<App />);
    expect(screen.getByText('どのくらい自信がありますか？')).toBeInTheDocument();
    expect(document.querySelectorAll('.choice--selected')).toHaveLength(1);
  });

  it('中断したときはホームに「続きから」が出る', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    await user.click(screen.getByRole('button', { name: SHORT.name }));
    await answer(user, { correct: true, confidence: '自信あり' });
    await user.click(screen.getByRole('button', { name: '中断' }));
    unmount();

    render(<App />);
    // 自動再開はせず、ホームに再開ボタンが並ぶ
    expect(screen.getByRole('button', { name: /^全問/ })).toBeInTheDocument();
    const resume = screen.getByRole('button', { name: SHORT.label });
    expect(resume).toHaveTextContent(`2 / ${SHORT.size} 問`);

    await user.click(resume);
    expect(screen.getByText(`2 / ${SHORT.size}`)).toBeInTheDocument();
  });

  it('別のモードを始めると続きは上書きされる', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: SHORT.name }));
    await answer(user, { correct: true, confidence: '自信あり' });
    await user.click(screen.getByRole('button', { name: '中断' }));

    await user.click(screen.getByRole('button', { name: /^時制/ }));
    await user.click(screen.getByRole('button', { name: '中断' }));

    // 再開カードは後から始めた「時制」を指している
    const card = document.querySelector('.card--resume');
    expect(card?.querySelector('.mode__name')).toHaveTextContent('時制');
    expect(card?.textContent).not.toContain('関係副詞');
  });

  it('最後まで解き切ると続きは残らない', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    await user.click(screen.getByRole('button', { name: SHORT.name }));
    await answerAll(user, () => ({ correct: true, confidence: '自信あり' }));
    await user.click(screen.getByRole('button', { name: 'ホームへ' }));

    expect(document.querySelector('.card--resume')).toBeNull();
    unmount();

    render(<App />);
    expect(document.querySelector('.card--resume')).toBeNull();
    expect(screen.getByRole('button', { name: /^全問/ })).toBeInTheDocument();
  });

  it('問題データから id が消えた続きは破棄する', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    await user.click(screen.getByRole('button', { name: SHORT.name }));
    await user.click(screen.getByRole('button', { name: '中断' }));
    unmount();

    // 保存済みの出題順に、存在しない id を混ぜる
    const raw = JSON.parse(localStorage.getItem('idiom.session.v1') ?? '{}');
    raw.orderIds = [...raw.orderIds, 'deleted-question-id'];
    localStorage.setItem('idiom.session.v1', JSON.stringify(raw));

    render(<App />);
    expect(document.querySelector('.card--resume')).toBeNull();
    expect(screen.getByRole('button', { name: /^全問/ })).toBeInTheDocument();
  });
});

describe('データの書き出し／取り込み', () => {
  /** ホームの「累計」カードに出ている「7 / 10」を読む。 */
  function lifetimeScore(): string {
    return (document.querySelector('.result__score')?.textContent ?? '').split('（')[0].trim();
  }

  function transferArea(): HTMLTextAreaElement {
    return document.querySelector('.transfer__area') as HTMLTextAreaElement;
  }

  it('書き出すと取り込み可能な JSON が出る', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: '書き出す' }));

    const payload = JSON.parse(transferArea().value);
    expect(payload.app).toBe('idiom');
    expect(parseBackup(transferArea().value)).not.toBeNull();
  });

  it('解いた結果が書き出しに含まれる', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: SHORT.name }));
    await answer(user, { correct: true, confidence: '自信あり' });
    await user.click(screen.getByRole('button', { name: '中断' }));
    await user.click(screen.getByRole('button', { name: '書き出す' }));

    const parsed = parseBackup(transferArea().value)?.progress;
    expect(parsed?.answered).toBe(1);
    expect(parsed?.correct).toBe(1);
  });

  it('取り込むと累計が置き換わり、保存もされる', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(lifetimeScore()).toBe('0 / 0');

    await user.click(screen.getByRole('button', { name: '取り込む' }));
    fireEvent.change(transferArea(), {
      target: {
        value: JSON.stringify({
          answered: 10,
          correct: 7,
          wrongIds: [questions[0].id],
          byConfidence: {
            sure: { answered: 6, correct: 6 },
            unsure: { answered: 2, correct: 1 },
            guess: { answered: 2, correct: 0 },
          },
          updatedAt: '2026-09-02T00:00:00.000Z',
        }),
      },
    });
    await user.click(screen.getByRole('button', { name: '読み込む' }));

    expect(lifetimeScore()).toBe('7 / 10');
    expect(screen.getByRole('button', { name: /^復習/ })).toHaveTextContent('1 問');
    expect(JSON.parse(localStorage.getItem('idiom.progress.v2') ?? '{}').answered).toBe(10);
  });

  it('壊れた入力は取り込まず、その旨を出す', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: '取り込む' }));
    fireEvent.change(transferArea(), { target: { value: '{"foo":1}' } });
    await user.click(screen.getByRole('button', { name: '読み込む' }));

    expect(screen.getByRole('status')).toHaveTextContent('読み込めませんでした');
    expect(lifetimeScore()).toBe('0 / 0');
  });
});

describe('メモ', () => {
  it('回答後に書いたメモがホームの一覧と localStorage に残る', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: SHORT.name }));

    const q = currentQuestion();
    await user.click(choiceButtons()[q.answerIndex]);
    await user.click(screen.getByRole('button', { name: /自信あり/ }));
    await user.type(screen.getByLabelText('メモ'), '完全文なので関係副詞');

    await user.click(screen.getByRole('button', { name: '中断' }));

    expect(screen.getByRole('heading', { name: 'メモ（1 件）' })).toBeInTheDocument();
    expect(screen.getByText('完全文なので関係副詞')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('idiom.notes.v1') ?? '{}')).toEqual({
      [q.id]: '完全文なので関係副詞',
    });
  });

  it('同じ問題に戻ると書いたメモが入っている', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    await user.click(screen.getByRole('button', { name: SHORT.name }));
    const q = currentQuestion();
    await user.click(choiceButtons()[q.answerIndex]);
    await user.click(screen.getByRole('button', { name: /自信あり/ }));
    await user.type(screen.getByLabelText('メモ'), 'おぼえる');
    unmount();

    // 解きかけのセッションごと復元されるので、同じ問題のメモが読み込まれている
    render(<App />);
    expect(screen.getByLabelText('メモ')).toHaveValue('おぼえる');
  });

  it('一覧から削除できる', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: SHORT.name }));
    const q = currentQuestion();
    await user.click(choiceButtons()[q.answerIndex]);
    await user.click(screen.getByRole('button', { name: /自信あり/ }));
    await user.type(screen.getByLabelText('メモ'), 'けす');
    await user.click(screen.getByRole('button', { name: '中断' }));

    await user.click(screen.getByRole('button', { name: `${q.id} のメモを削除` }));
    expect(screen.getByRole('heading', { name: 'メモ（0 件）' })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('idiom.notes.v1') ?? '{}')).toEqual({});
  });

  it('書き出しにメモが含まれ、取り込むと復元される', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: SHORT.name }));
    const q = currentQuestion();
    await user.click(choiceButtons()[q.answerIndex]);
    await user.click(screen.getByRole('button', { name: /自信あり/ }));
    await user.type(screen.getByLabelText('メモ'), 'もちだす');
    await user.click(screen.getByRole('button', { name: '中断' }));

    await user.click(screen.getByRole('button', { name: '書き出す' }));
    const json = (document.querySelector('.transfer__area') as HTMLTextAreaElement).value;
    expect(parseBackup(json)?.notes).toEqual({ [q.id]: 'もちだす' });

    // 消してから取り込み直すと戻る
    await user.click(screen.getByRole('button', { name: `${q.id} のメモを削除` }));
    expect(screen.getByRole('heading', { name: 'メモ（0 件）' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '取り込む' }));
    fireEvent.change(document.querySelector('.transfer__area') as HTMLTextAreaElement, {
      target: { value: json },
    });
    await user.click(screen.getByRole('button', { name: '読み込む' }));
    expect(screen.getByRole('heading', { name: 'メモ（1 件）' })).toBeInTheDocument();
    expect(screen.getByText('もちだす')).toBeInTheDocument();
  });
});

describe('前の問題に戻る', () => {
  /** 累計の回答数。進捗が二重に記録されていないかを見る。 */
  function lifetimeAnswered(): number {
    return JSON.parse(localStorage.getItem('idiom.progress.v2') ?? '{}').answered ?? 0;
  }

  function verdict(): string {
    return document.querySelector('.card__verdict')?.textContent ?? '';
  }

  it('1 問目には「前へ」が出ない', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: SHORT.name }));
    expect(screen.queryByRole('button', { name: /前へ/ })).toBeNull();
  });

  it('戻ると解答済みの状態のまま表示される', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: SHORT.name }));

    const first = currentQuestion();
    await answer(user, { correct: false, confidence: '勘' });
    expect(currentQuestion()).not.toBe(first);

    await user.click(screen.getByRole('button', { name: /前へ/ }));
    expect(currentQuestion()).toBe(first);
    // 正誤・自信度・解説がそのまま戻る
    expect(verdict()).toContain('不正解');
    expect(verdict()).toContain('勘');
    expect(screen.getByText(first.explanation)).toBeInTheDocument();
  });

  it('戻ってからもう一度進めても進捗を二重に記録しない', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: SHORT.name }));
    await answer(user, { correct: true, confidence: '自信あり' });
    expect(lifetimeAnswered()).toBe(1);

    await user.click(screen.getByRole('button', { name: /前へ/ }));
    await user.click(screen.getByRole('button', { name: /次の問題へ/ }));
    expect(lifetimeAnswered()).toBe(1);
  });

  it('戻った先では選び直せない', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: SHORT.name }));
    const first = currentQuestion();
    await answer(user, { correct: true, confidence: '自信あり' });

    await user.click(screen.getByRole('button', { name: /前へ/ }));
    await user.click(choiceButtons()[(first.answerIndex + 1) % 4]);
    expect(verdict()).toContain('正解');
    expect(lifetimeAnswered()).toBe(1);
  });

  it('未回答の問題からでも戻れる', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: SHORT.name }));
    const first = currentQuestion();
    await answer(user, { correct: true, confidence: '自信あり' });

    // 2 問目は手を付けていない状態でも「前へ」は押せる
    expect(screen.queryByRole('button', { name: /次の問題へ/ })).toBeNull();
    await user.click(screen.getByRole('button', { name: /前へ/ }));
    expect(currentQuestion()).toBe(first);
  });

  it('セッションを再開しても戻れる状態が保たれる', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    await user.click(screen.getByRole('button', { name: SHORT.name }));
    const first = currentQuestion();
    await answer(user, { correct: false, confidence: '迷った' });
    unmount();

    render(<App />);
    await user.click(screen.getByRole('button', { name: /前へ/ }));
    expect(currentQuestion()).toBe(first);
    expect(verdict()).toContain('迷った');
  });

  it('戻ってもセッションの正解数は変わらない', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: SHORT.name }));
    const total = sessionTotal();
    await answer(user, { correct: true, confidence: '自信あり' });
    await answer(user, { correct: false, confidence: '勘' });

    // 1 問目まで戻ってから、最後まで解き切る
    await user.click(screen.getByRole('button', { name: /前へ/ }));
    await user.click(screen.getByRole('button', { name: /前へ/ }));
    await user.click(screen.getByRole('button', { name: /次の問題へ/ }));
    await user.click(screen.getByRole('button', { name: /次の問題へ/ }));
    for (let i = 2; i < total; i++) {
      await answer(user, { correct: true, confidence: '自信あり' });
    }
    expect(screen.getByText(`${total - 1} / ${total}`)).toBeInTheDocument();
  });
});

describe('カテゴリ解説', () => {
  it('解説のあるカテゴリにだけ「解説」ボタンが出る', () => {
    render(<App />);
    const guided = screen.getAllByRole('button', { name: '解説' });
    expect(guided.length).toBeGreaterThan(0);
    // 解説を持たないカテゴリの分まで出ていないこと
    expect(guided).toHaveLength(guides.length);
  });

  it('解説を開くと見出しと表と例文が出る', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getAllByRole('button', { name: '解説' })[0]);

    const guide = guides[0];
    expect(screen.getByRole('heading', { name: guide.category })).toBeInTheDocument();
    expect(screen.getByText(guide.summary)).toBeInTheDocument();
    for (const section of guide.sections) {
      expect(screen.getByRole('heading', { name: section.heading })).toBeInTheDocument();
    }
    expect(document.querySelectorAll('.guide__table').length).toBeGreaterThan(0);
    expect(document.querySelectorAll('.guide__example').length).toBeGreaterThan(0);
  });

  it('解説からそのカテゴリを解き始められる', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getAllByRole('button', { name: '解説' })[0]);

    const category = guides[0].category;
    const size = questions.filter((q) => q.category === category).length;
    await user.click(
      screen.getByRole('button', { name: new RegExp(`このカテゴリを解く（${size} 問）`) }),
    );

    expect(sessionTotal()).toBe(size);
    expect(currentQuestion().category).toBe(category);
  });

  it('解説からホームに戻れる', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getAllByRole('button', { name: '解説' })[0]);
    await user.click(screen.getByRole('button', { name: 'ホームへ' }));
    expect(screen.getByRole('button', { name: /^全問/ })).toBeInTheDocument();
  });

  it('解説を開いても解きかけのセッションは消えない', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: SHORT.name }));
    await answer(user, { correct: true, confidence: '自信あり' });
    await user.click(screen.getByRole('button', { name: '中断' }));

    await user.click(screen.getAllByRole('button', { name: '解説' })[0]);
    await user.click(screen.getByRole('button', { name: 'ホームへ' }));
    expect(screen.getByRole('button', { name: SHORT.label })).toBeInTheDocument();
  });
});

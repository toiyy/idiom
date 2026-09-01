import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { questions } from '../data/questions';

type User = ReturnType<typeof userEvent.setup>;
type Label = '自信あり' | '迷った' | '勘';

/** 画面に出ている選択肢ボタン（表示順 = choices の順）。 */
function choiceButtons(): HTMLButtonElement[] {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('.choice'));
}

/** 表示中の選択肢の並びから、いま出題されている問題を特定する。 */
function currentQuestion() {
  const labels = choiceButtons().map((b) => b.querySelector('.choice__label')?.textContent);
  const found = questions.find((q) => q.choices.every((c, i) => c === labels[i]));
  if (!found) throw new Error(`出題中の問題を特定できませんでした: ${labels.join(' / ')}`);
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
const SHORT = { name: /^関係副詞/, size: 6 };

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

  it('4 カテゴリが 2 段グループになる', () => {
    render(<App />);
    const groups = Array.from(document.querySelectorAll('.category-group'));
    // 並びは問題ファイル名順（relatives-* → verbals-* → vocabulary-* → word-form-*）で決まる
    const names = groups.map((g) => g.querySelector('.category-group__name')?.textContent);
    expect(names).toEqual(['関係詞', '準動詞', '語彙', '品詞識別']);
    expect(groups[0].querySelectorAll('.category')).toHaveLength(2);
    expect(groups[1].querySelectorAll('.category')).toHaveLength(3);
    expect(groups[2].querySelectorAll('.category')).toHaveLength(7);
    expect(groups[3].querySelectorAll('.category')).toHaveLength(3);
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

    // 自信あり 2/2、迷った 1/2、勘 1/2 になるよう解く
    const plan: { correct: boolean; confidence: Label }[] = [
      { correct: true, confidence: '自信あり' },
      { correct: true, confidence: '自信あり' },
      { correct: true, confidence: '迷った' },
      { correct: false, confidence: '迷った' },
      { correct: true, confidence: '勘' },
      { correct: false, confidence: '勘' },
    ];
    expect(sessionTotal()).toBe(plan.length);
    await answerAll(user, (i) => plan[i]);

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

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

  it('サブカテゴリを持たない 12 カテゴリがフラットに並ぶ', () => {
    render(<App />);
    const flatGrid = document.querySelector('.card .category-list');
    expect(flatGrid?.querySelectorAll('.category')).toHaveLength(12);
  });

  it('語彙カテゴリが 7 サブカテゴリを従えて 1 グループになる', () => {
    render(<App />);
    const groups = document.querySelectorAll('.category-group');
    expect(groups).toHaveLength(1);
    expect(groups[0].querySelector('.category-group__name')).toHaveTextContent('語彙');
    expect(groups[0].querySelectorAll('.category')).toHaveLength(7);
  });
});

describe('サブカテゴリ出題', () => {
  it('サブカテゴリを選ぶとその 5 問だけが出る', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^句動詞/ }));
    expect(screen.getByText('1 / 5')).toBeInTheDocument();
    expect(screen.getByText('語彙 / 句動詞')).toBeInTheDocument();
  });

  it('語彙の「すべて」を選ぶと 35 問が出る', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^語彙/ }));
    expect(screen.getByText('1 / 35')).toBeInTheDocument();
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
    await user.click(screen.getByRole('button', { name: /^時制/ }));

    for (let i = 0; i < 3; i++) await answer(user, { correct: true, confidence: '自信あり' });

    expect(document.querySelector('.result__score')).toHaveTextContent('3 / 3');
    expect(screen.getByRole('button', { name: '復習する（0）' })).toBeDisabled();
  });

  it('勘で正解した問題は復習対象に残る', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^時制/ }));

    await answer(user, { correct: true, confidence: '勘' });
    await answer(user, { correct: true, confidence: '迷った' });
    await answer(user, { correct: true, confidence: '自信あり' });

    // 3 問全問正解でも、確信のない 2 問は復習に残る
    expect(document.querySelector('.result__score')).toHaveTextContent('3 / 3');
    expect(screen.getByRole('button', { name: '復習する（2）' })).toBeEnabled();
  });

  it('誤答した問題が復習モードで再出題される', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^時制/ }));

    for (let i = 0; i < 3; i++) await answer(user, { correct: false, confidence: '勘' });

    expect(document.querySelector('.result__score')).toHaveTextContent('0 / 3');
    await user.click(screen.getByRole('button', { name: '復習する（3）' }));
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    expect(screen.getByText('復習')).toBeInTheDocument();
  });

  it('復習で自信ありで正解すると復習対象が空になる', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^時制/ }));

    await answer(user, { correct: false, confidence: '勘' });
    await answer(user, { correct: true, confidence: '自信あり' });
    await answer(user, { correct: true, confidence: '自信あり' });

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
    await user.click(screen.getByRole('button', { name: /^時制/ }));

    await answer(user, { correct: true, confidence: '自信あり' });
    await answer(user, { correct: true, confidence: '勘' });
    await answer(user, { correct: false, confidence: '勘' });

    const rows = document.querySelectorAll('.conf-table tbody tr');
    expect(rows[0]).toHaveTextContent('自信あり');
    expect(rows[0]).toHaveTextContent('100%');
    expect(rows[2]).toHaveTextContent('勘');
    expect(rows[2]).toHaveTextContent('50%');
    expect(document.querySelector('.conf-table__note')).toHaveTextContent('1 問');
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

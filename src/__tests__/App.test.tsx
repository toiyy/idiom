import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { questions } from '../data/questions';

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

/** いま出ている問題にわざと誤答して、次の問題（または結果）へ進む。 */
async function answerIncorrectly(user: ReturnType<typeof userEvent.setup>) {
  const q = currentQuestion();
  const wrongIndex = (q.answerIndex + 1) % 4;
  await user.click(choiceButtons()[wrongIndex]);
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

  it('カテゴリが 12 個並ぶ', () => {
    render(<App />);
    expect(document.querySelectorAll('.category')).toHaveLength(12);
  });
});

describe('カテゴリ別 → 復習 の流れ', () => {
  it('誤答した問題が復習モードで再出題される', async () => {
    const user = userEvent.setup();
    render(<App />);

    // 「時制」カテゴリ（3 問）を開始
    await user.click(screen.getByRole('button', { name: /^時制/ }));
    expect(screen.getByText('1 / 3')).toBeInTheDocument();

    // 3 問すべて誤答する
    await answerIncorrectly(user);
    await answerIncorrectly(user);
    await answerIncorrectly(user);

    // 結果画面: 0 / 3、要復習 3 問
    expect(screen.getByRole('heading', { name: '時制 の結果' })).toBeInTheDocument();
    expect(document.querySelector('.result__score')).toHaveTextContent('0 / 3');
    expect(screen.getByRole('button', { name: '復習する（3）' })).toBeEnabled();

    // 復習モードで 3 問が再出題される
    await user.click(screen.getByRole('button', { name: '復習する（3）' }));
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    expect(screen.getByText('復習')).toBeInTheDocument();
  });

  it('正解した問題は復習対象から外れる', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /^時制/ }));

    // 1 問目だけ誤答し、残り 2 問は正解する
    await answerIncorrectly(user);
    for (let i = 0; i < 2; i++) {
      const q = currentQuestion();
      await user.click(choiceButtons()[q.answerIndex]);
      await user.click(screen.getByRole('button', { name: /次の問題へ|結果を見る/ }));
    }

    // 要復習は 1 問だけ
    expect(screen.getByRole('button', { name: '復習する（1）' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: '復習する（1）' }));
    expect(screen.getByText('1 / 1')).toBeInTheDocument();

    // その 1 問に正解すると復習対象が空になる
    const q = currentQuestion();
    await user.click(choiceButtons()[q.answerIndex]);
    await user.click(screen.getByRole('button', { name: '結果を見る' }));
    expect(screen.getByRole('button', { name: '復習する（0）' })).toBeDisabled();
  });
});

describe('進捗の永続化', () => {
  it('累計が localStorage に保存され、再マウント後も残る', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    await user.click(screen.getByRole('button', { name: /^時制/ }));
    await answerIncorrectly(user);
    await user.click(screen.getByRole('button', { name: '中断' }));
    unmount();

    render(<App />);
    // 1 問回答済み・0 問正解、要復習 1 問なので復習モードが有効になっている
    expect(screen.getByRole('button', { name: /^復習/ })).toBeEnabled();
    expect(screen.getByText('0 / 1')).toBeInTheDocument();
  });
});

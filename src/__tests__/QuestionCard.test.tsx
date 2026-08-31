import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuestionCard } from '../components/QuestionCard';
import type { Question } from '../types/question';

const question: Question = {
  id: 'q1',
  part: 5,
  category: '前置詞',
  sentence: 'It will start ___ Monday.',
  choices: ['in', 'at', 'on', 'since'],
  answerIndex: 2,
  explanation: '曜日の前は on。',
};

function setup(selectedIndex: number | null) {
  const onSelect = vi.fn();
  const onNext = vi.fn();
  render(
    <QuestionCard
      question={question}
      index={0}
      total={3}
      selectedIndex={selectedIndex}
      onSelect={onSelect}
      onNext={onNext}
    />,
  );
  return { onSelect, onNext };
}

describe('QuestionCard', () => {
  it('未回答では選択肢クリックで onSelect が呼ばれる', async () => {
    const { onSelect } = setup(null);
    await userEvent.click(screen.getByRole('button', { name: /on/ }));
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('回答後は解説と次へボタンが出る', () => {
    setup(1);
    expect(screen.getByText('曜日の前は on。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '次の問題へ' })).toBeInTheDocument();
  });

  it('最終問題では「結果を見る」になる', () => {
    const onNext = vi.fn();
    render(
      <QuestionCard
        question={question}
        index={2}
        total={3}
        selectedIndex={0}
        onSelect={vi.fn()}
        onNext={onNext}
      />,
    );
    expect(screen.getByRole('button', { name: '結果を見る' })).toBeInTheDocument();
  });
});

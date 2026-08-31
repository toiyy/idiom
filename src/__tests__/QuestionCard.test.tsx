import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuestionCard } from '../components/QuestionCard';
import type { Confidence } from '../lib/storage';
import type { Question } from '../types/question';

const question: Question = {
  id: 'q1',
  part: 5,
  category: '前置詞',
  sentence: 'It will start ___ Monday.',
  choices: ['in', 'at', 'on', 'since'],
  answerIndex: 2,
  explanation: '曜日の前は on。',
  translation: 'それは月曜日に始まる。',
};

function setup(selectedIndex: number | null, confidence: Confidence | null, index = 0) {
  const onSelect = vi.fn();
  const onConfidence = vi.fn();
  const onNext = vi.fn();
  render(
    <QuestionCard
      question={question}
      index={index}
      total={3}
      selectedIndex={selectedIndex}
      confidence={confidence}
      onSelect={onSelect}
      onConfidence={onConfidence}
      onNext={onNext}
    />,
  );
  return { onSelect, onConfidence, onNext };
}

describe('QuestionCard', () => {
  it('未回答では選択肢クリックで onSelect が呼ばれる', async () => {
    const { onSelect } = setup(null, null);
    await userEvent.click(screen.getByRole('button', { name: /on/ }));
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('選択肢を選んだだけでは正誤も訳も出さない', () => {
    setup(1, null);
    expect(screen.queryByText('不正解')).not.toBeInTheDocument();
    expect(screen.queryByText('それは月曜日に始まる。')).not.toBeInTheDocument();
    expect(screen.getByText('どのくらい自信がありますか？')).toBeInTheDocument();
  });

  it('自信度ボタンを押すと onConfidence が呼ばれる', async () => {
    const { onConfidence } = setup(1, null);
    await userEvent.click(screen.getByRole('button', { name: /勘/ }));
    expect(onConfidence).toHaveBeenCalledWith('guess');
  });

  it('自信度が決まると正誤・日本語訳・解説が出る', () => {
    setup(1, 'unsure');
    expect(screen.getByText('不正解')).toBeInTheDocument();
    expect(screen.getByText('それは月曜日に始まる。')).toBeInTheDocument();
    expect(screen.getByText('曜日の前は on。')).toBeInTheDocument();
    expect(screen.getByText('迷った')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '次の問題へ' })).toBeInTheDocument();
  });

  it('正解時は正解と表示される', () => {
    setup(2, 'sure');
    expect(screen.getByText('正解')).toBeInTheDocument();
  });

  it('最終問題では「結果を見る」になる', () => {
    setup(0, 'sure', 2);
    expect(screen.getByRole('button', { name: '結果を見る' })).toBeInTheDocument();
  });
});

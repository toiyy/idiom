import type { Question } from '../types/question';
import { ChoiceButton } from './ChoiceButton';

interface QuestionCardProps {
  question: Question;
  index: number;
  total: number;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onNext: () => void;
}

function choiceState(
  choiceIndex: number,
  answerIndex: number,
  selectedIndex: number | null,
): 'idle' | 'correct' | 'wrong' | 'missed' {
  if (selectedIndex === null) return 'idle';
  if (choiceIndex === answerIndex) return 'correct';
  if (choiceIndex === selectedIndex) return 'wrong';
  return 'missed';
}

export function QuestionCard({
  question,
  index,
  total,
  selectedIndex,
  onSelect,
  onNext,
}: QuestionCardProps) {
  const answered = selectedIndex !== null;
  const correct = answered && selectedIndex === question.answerIndex;
  const [before, after] = question.sentence.split('___');

  return (
    <section className="card">
      <header className="card__meta">
        <span>
          {index + 1} / {total}
        </span>
        <span>
          Part {question.part} ・ {question.category}
        </span>
      </header>

      <p className="card__sentence">
        {before}
        <span className="card__blank">
          {answered ? question.choices[question.answerIndex] : '___'}
        </span>
        {after}
      </p>

      <div className="card__choices">
        {question.choices.map((choice, i) => (
          <ChoiceButton
            key={i}
            label={choice}
            index={i}
            state={choiceState(i, question.answerIndex, selectedIndex)}
            disabled={answered}
            onSelect={onSelect}
          />
        ))}
      </div>

      {answered && (
        <div className={`card__result ${correct ? 'is-correct' : 'is-wrong'}`}>
          <strong>{correct ? '正解' : '不正解'}</strong>
          <p className="card__explanation">{question.explanation}</p>
          <button type="button" className="btn btn--primary" onClick={onNext}>
            {index + 1 === total ? '結果を見る' : '次の問題へ'}
          </button>
        </div>
      )}
    </section>
  );
}

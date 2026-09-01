import type { Question } from '../types/question';
import { CONFIDENCES, CONFIDENCE_LABELS, type Confidence } from '../lib/storage';
import { ChoiceButton, type ChoiceState } from './ChoiceButton';

interface QuestionCardProps {
  question: Question;
  index: number;
  total: number;
  selectedIndex: number | null;
  /** 自信度が未申告のあいだは正誤を伏せる。 */
  confidence: Confidence | null;
  onSelect: (index: number) => void;
  onConfidence: (confidence: Confidence) => void;
  onNext: () => void;
}

function choiceState(
  choiceIndex: number,
  answerIndex: number,
  selectedIndex: number | null,
  revealed: boolean,
): ChoiceState {
  if (selectedIndex === null) return 'idle';
  // 自信度の申告前は、選んだ選択肢を示すだけで正誤は明かさない
  if (!revealed) return choiceIndex === selectedIndex ? 'selected' : 'idle';
  if (choiceIndex === answerIndex) return 'correct';
  if (choiceIndex === selectedIndex) return 'wrong';
  return 'missed';
}

export function QuestionCard({
  question,
  index,
  total,
  selectedIndex,
  confidence,
  onSelect,
  onConfidence,
  onNext,
}: QuestionCardProps) {
  const picked = selectedIndex !== null;
  const revealed = picked && confidence !== null;
  const correct = revealed && selectedIndex === question.answerIndex;
  const [before, after] = question.sentence.split('___');

  return (
    <section className="card">
      <header className="card__meta">
        <span>
          {index + 1} / {total}
        </span>
        <span>
          Part {question.part} ・ {question.subcategory ?? question.category}
        </span>
      </header>

      <p className="card__sentence">
        {before}
        <span className="card__blank">
          {revealed ? question.choices[question.answerIndex] : '___'}
        </span>
        {after}
      </p>

      <div className="card__choices">
        {question.choices.map((choice, i) => (
          <ChoiceButton
            key={i}
            label={choice}
            index={i}
            state={choiceState(i, question.answerIndex, selectedIndex, revealed)}
            disabled={picked}
            // 正解の理由は解説にまとめてあるので、不正解の選択肢にだけ理由を添える
            note={revealed && i !== question.answerIndex ? question.choiceNotes[choice] : undefined}
            onSelect={onSelect}
          />
        ))}
      </div>

      {picked && !revealed && (
        <div className="confidence">
          <p className="confidence__prompt">どのくらい自信がありますか？</p>
          <div className="confidence__buttons">
            {CONFIDENCES.map((c, i) => (
              <button
                key={c}
                type="button"
                className={`btn confidence__btn confidence__btn--${c}`}
                onClick={() => onConfidence(c)}
              >
                <span className="confidence__key">{i + 1}</span>
                {CONFIDENCE_LABELS[c]}
              </button>
            ))}
          </div>
          <p className="confidence__hint">
            「自信あり」で正解した問題だけが復習リストから外れます。
          </p>
        </div>
      )}

      {revealed && (
        <div className={`card__result ${correct ? 'is-correct' : 'is-wrong'}`}>
          <p className="card__verdict">
            <strong>{correct ? '正解' : '不正解'}</strong>
            <span className="card__confidence">{CONFIDENCE_LABELS[confidence]}</span>
          </p>
          <p className="card__translation">{question.translation}</p>
          <p className="card__explanation">{question.explanation}</p>
          <button type="button" className="btn btn--primary" onClick={onNext}>
            {index + 1 === total ? '結果を見る' : '次の問題へ'}
          </button>
        </div>
      )}
    </section>
  );
}

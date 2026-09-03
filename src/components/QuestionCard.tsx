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
  /** 直前の問題を見返す。1 問目では呼ばれない。 */
  onPrev: () => void;
  /** この問題に付けたメモ。未記入なら空文字。 */
  note: string;
  onNoteChange: (text: string) => void;
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
  onPrev,
  note,
  onNoteChange,
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
        {/* カテゴリは解く前だとヒントになるので、回答後にだけ出す */}
        {revealed && (
          <span>
            Part {question.part} ・ {question.subcategory ?? question.category}
          </span>
        )}
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

          {/* 間違えた理由や自分なりの覚え方を残す。入力するそばから保存する */}
          <label className="note">
            <span className="note__label">メモ</span>
            <textarea
              className="note__area"
              rows={2}
              placeholder="間違えた理由や覚え方をここに"
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
            />
          </label>
        </div>
      )}

      {/* 「前へ」は未回答でも押せる。直前の解説をもう一度見たいことがあるため */}
      {(index > 0 || revealed) && (
        <div className="card__nav">
          {index > 0 && (
            <button type="button" className="btn btn--ghost card__prev" onClick={onPrev}>
              ← 前へ
            </button>
          )}
          {revealed && (
            <button type="button" className="btn btn--primary" onClick={onNext}>
              {index + 1 === total ? '結果を見る' : '次の問題へ'}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

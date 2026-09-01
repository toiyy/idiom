export type ChoiceState = 'idle' | 'selected' | 'correct' | 'wrong' | 'missed';

interface ChoiceButtonProps {
  label: string;
  index: number;
  state: ChoiceState;
  disabled: boolean;
  /** 回答後に表示する「なぜ違うか」。不正解の選択肢にだけ渡す。 */
  note?: string;
  onSelect: (index: number) => void;
}

const MARKS = ['A', 'B', 'C', 'D'];

export function ChoiceButton({ label, index, state, disabled, note, onSelect }: ChoiceButtonProps) {
  return (
    <button
      type="button"
      className={`choice choice--${state}`}
      disabled={disabled}
      onClick={() => onSelect(index)}
    >
      <span className="choice__mark">{MARKS[index] ?? index + 1}</span>
      <span className="choice__body">
        <span className="choice__label">{label}</span>
        {note && <span className="choice__note">{note}</span>}
      </span>
    </button>
  );
}

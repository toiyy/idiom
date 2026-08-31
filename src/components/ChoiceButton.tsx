interface ChoiceButtonProps {
  label: string;
  index: number;
  state: 'idle' | 'correct' | 'wrong' | 'missed';
  disabled: boolean;
  onSelect: (index: number) => void;
}

const MARKS = ['A', 'B', 'C', 'D'];

export function ChoiceButton({ label, index, state, disabled, onSelect }: ChoiceButtonProps) {
  return (
    <button
      type="button"
      className={`choice choice--${state}`}
      disabled={disabled}
      onClick={() => onSelect(index)}
    >
      <span className="choice__mark">{MARKS[index] ?? index + 1}</span>
      <span className="choice__label">{label}</span>
    </button>
  );
}

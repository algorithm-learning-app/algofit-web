import { useMemo, useState } from 'react';
import {
  checkBlankAnswer,
  getPcBonusQuestion,
  renderCodeWithSelections,
} from '../../lib/pcBonus';

type Props = {
  onSubmit: (isCorrect: boolean) => void;
};

export default function PcBonusQuestion({ onSubmit }: Props) {
  const question = getPcBonusQuestion();
  const [blankSelections, setBlankSelections] = useState<Record<string, string>>({});

  const codePreview = useMemo(
    () => renderCodeWithSelections(question.codeTemplate, blankSelections),
    [question.codeTemplate, blankSelections],
  );

  const canSubmit = question.blanks.every((b) => blankSelections[b.id]);

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit(checkBlankAnswer(question, blankSelections));
  }

  return (
    <>
      <span className="daily__type-badge">Blank · PC 보너스</span>
      <p className="daily__stem">{question.stem}</p>
      <pre className="daily__code">
        <code>{codePreview}</code>
      </pre>
      {question.blanks.map((slot) => (
        <div key={slot.id} className="daily__blank-group">
          <p className="daily__blank-label">{slot.id} 빈칸</p>
          <div className="daily__choices">
            {slot.choices.map((choice) => (
              <button
                key={choice}
                type="button"
                className={`daily__choice${
                  blankSelections[slot.id] === choice ? ' daily__choice--selected' : ''
                }`}
                onClick={() =>
                  setBlankSelections((prev) => ({ ...prev, [slot.id]: choice }))
                }
              >
                {choice}
              </button>
            ))}
          </div>
        </div>
      ))}
      <button
        type="button"
        className="btn-primary daily__submit"
        disabled={!canSubmit}
        onClick={handleSubmit}
      >
        확인
      </button>
    </>
  );
}

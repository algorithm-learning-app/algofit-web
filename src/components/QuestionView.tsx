import { useMemo, useState } from 'react';
import {
  checkBlankAnswer,
  checkPickAnswer,
  isBlankQuestion,
  isPickQuestion,
  renderCodeWithSelections,
  type DailyQuestion,
} from '../lib/daily';

type Props = {
  question: DailyQuestion;
  onSubmit: (isCorrect: boolean) => void;
};

/**
 * Daily/스테이지 공용 문항 렌더러. Daily.css 의 daily__* 클래스를 재사용한다.
 * (기존 DailyQuestion 의 렌더 로직을 question prop 으로 일반화.)
 */
export default function QuestionView({ question, onSubmit }: Props) {
  const [pickChoice, setPickChoice] = useState<string | null>(null);
  const [blankSelections, setBlankSelections] = useState<Record<string, string>>({});

  const codePreview = useMemo(() => {
    if (!isBlankQuestion(question)) return '';
    return renderCodeWithSelections(question.codeTemplate, blankSelections);
  }, [question, blankSelections]);

  const canSubmit = isPickQuestion(question)
    ? pickChoice !== null
    : question.blanks.every((b) => blankSelections[b.id]);

  function handleSubmit() {
    if (!canSubmit) return;
    if (isPickQuestion(question)) {
      onSubmit(checkPickAnswer(question, pickChoice!));
      return;
    }
    onSubmit(checkBlankAnswer(question, blankSelections));
  }

  return (
    <>
      <span className="daily__type-badge">
        {isPickQuestion(question) ? 'Pick' : 'Blank'}
      </span>
      <p className="daily__stem">{question.stem}</p>

      {isPickQuestion(question) ? (
        <div className="daily__choices">
          {question.choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              className={`daily__choice${
                pickChoice === choice.id ? ' daily__choice--selected' : ''
              }`}
              onClick={() => setPickChoice(choice.id)}
            >
              {choice.label}
            </button>
          ))}
        </div>
      ) : (
        <>
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
                      blankSelections[slot.id] === choice
                        ? ' daily__choice--selected'
                        : ''
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
        </>
      )}

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

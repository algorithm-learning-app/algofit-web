import { DAILY_XP_PER_QUESTION } from '../../lib/daily';

type Props = {
  isCorrect: boolean;
  message: string;
  onContinue: () => void;
  xpAmount?: number | null;
  continueLabel?: string;
};

export default function DailyFeedback({
  isCorrect,
  message,
  onContinue,
  xpAmount,
  continueLabel = '다음',
}: Props) {
  const xp =
    xpAmount === undefined ? DAILY_XP_PER_QUESTION : xpAmount;
  return (
    <div className="daily-feedback">
      <p className="daily-feedback__icon" aria-hidden>
        {isCorrect ? '✨' : '💔'}
      </p>
      <h2
        className={`daily-feedback__title${
          isCorrect ? ' daily-feedback__title--correct' : ' daily-feedback__title--wrong'
        }`}
      >
        {isCorrect ? '정답!' : '오답'}
      </h2>
      <p className="daily-feedback__message">{message}</p>
      {xp !== null && <p className="daily-feedback__xp">+{xp} XP</p>}
      <button type="button" className="btn-primary" onClick={onContinue}>
        {continueLabel}
      </button>
    </div>
  );
}

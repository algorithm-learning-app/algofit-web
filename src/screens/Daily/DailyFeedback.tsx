import { DAILY_XP_PER_QUESTION } from '../../lib/daily';

type Props = {
  isCorrect: boolean;
  message: string;
  onContinue: () => void;
};

export default function DailyFeedback({ isCorrect, message, onContinue }: Props) {
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
      <p className="daily-feedback__xp">+{DAILY_XP_PER_QUESTION} XP</p>
      <button type="button" className="btn-primary" onClick={onContinue}>
        다음
      </button>
    </div>
  );
}

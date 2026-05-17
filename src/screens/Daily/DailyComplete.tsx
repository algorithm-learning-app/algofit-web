import { Link } from 'react-router-dom';
import { DAILY_TOTAL } from '../../lib/daily';

type Props = {
  allCorrect: boolean;
  streakCount: number;
  xpEarned: number;
};

export default function DailyComplete({ allCorrect, streakCount, xpEarned }: Props) {
  return (
    <div className="daily-complete">
      <p className="daily-complete__icon" aria-hidden>
        {allCorrect ? '🔥' : '🌙'}
      </p>
      <h1 className="daily-complete__title">
        {allCorrect ? '오늘 챌린지 클리어!' : '챌린지 완료'}
      </h1>
      <p className="daily-complete__desc">
        {allCorrect
          ? `${DAILY_TOTAL}문제 전부 정답! 스트릭이 1일 늘었어요.`
          : '오늘 스트릭은 내일 다시 도전해 보세요. 5문제 전부 정답이면 스트릭이 올라가요.'}
      </p>
      {allCorrect && (
        <p className="daily-complete__streak" aria-label={`스트릭 ${streakCount}일`}>
          <span aria-hidden>🔥</span>
          {streakCount}일 연속
        </p>
      )}
      <p className="daily-complete__desc">이번 세션 +{xpEarned} XP</p>
      <Link to="/home" className="btn-primary">
        홈으로
      </Link>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { DAILY_TOTAL } from '../../lib/daily';
import { DAILY_PERFECT_BONUS_XP } from '../../lib/progress';

type Props = {
  allCorrect: boolean;
  streakCount: number;
  xpEarned: number;
};

export default function DailyComplete({ allCorrect, streakCount, xpEarned }: Props) {
  return (
    <div className="daily-complete">
      <p className="daily-complete__icon" aria-hidden>
        {allCorrect ? '💯' : '🔥'}
      </p>
      <h1 className="daily-complete__title">
        {allCorrect ? '완벽한 하루!' : '오늘도 완료!'}
      </h1>
      <p className="daily-complete__desc">
        {allCorrect
          ? `${DAILY_TOTAL}문제 전부 정답! 스트릭 +1, 보너스 +${DAILY_PERFECT_BONUS_XP} XP.`
          : '스트릭이 1일 늘었어요. 꾸준함이 진짜 실력이에요.'}
      </p>
      <p className="daily-complete__streak" aria-label={`스트릭 ${streakCount}일`}>
        <span aria-hidden>🔥</span>
        {streakCount}일 연속
      </p>
      <p className="daily-complete__desc">
        이번 세션 +{xpEarned} XP{allCorrect ? ' (보너스 포함)' : ''}
      </p>
      <Link to="/home" className="btn-primary">
        홈으로
      </Link>
    </div>
  );
}

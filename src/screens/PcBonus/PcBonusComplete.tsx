import { Link } from 'react-router-dom';
import { PC_BONUS_XP } from '../../lib/pcBonus';

type Props = {
  xpEarned: number;
  alreadyDone: boolean;
};

export default function PcBonusComplete({ xpEarned, alreadyDone }: Props) {
  return (
    <div className="daily-complete">
      <p className="daily-complete__icon" aria-hidden>
        {alreadyDone ? '✓' : '🎉'}
      </p>
      <h1 className="daily-complete__title">
        {alreadyDone ? '오늘 보너스 완료' : 'PC 보너스 완료!'}
      </h1>
      <p className="daily-complete__desc">
        {alreadyDone
          ? '오늘은 이미 PC 보너스 XP를 받았어요. 내일 다시 도전할 수 있어요.'
          : '긴 빈칸 정답! 스트릭과 무관하게 보너스 XP를 받았어요.'}
      </p>
      {!alreadyDone && (
        <p className="daily-complete__desc">+{xpEarned || PC_BONUS_XP} XP</p>
      )}
      <Link to="/home" className="btn-primary">
        홈으로
      </Link>
    </div>
  );
}


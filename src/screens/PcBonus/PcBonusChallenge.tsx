import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getPcBonusQuestion, PC_BONUS_XP } from '../../lib/pcBonus';
import {
  completePcBonus,
  getTodaySeoul,
  loadProgress,
  type GuestProgress,
} from '../../lib/progress';
import DailyFeedback from '../Daily/DailyFeedback';
import '../Daily/Daily.css';
import PcBonusComplete from './PcBonusComplete';
import PcBonusQuestion from './PcBonusQuestion';

export default function PcBonusChallenge() {
  const location = useLocation();
  const navigate = useNavigate();
  const [progress, setProgress] = useState<GuestProgress | null>(null);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [xpEarned, setXpEarned] = useState(0);

  const isFeedbackRoute = location.pathname.endsWith('/feedback');
  const isCompleteRoute = location.pathname.endsWith('/complete');

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  useEffect(() => {
    if (!progress) return;
    const today = getTodaySeoul();
    if (progress.todayPcBonusCompleted && progress.lastPcBonusDate === today && !isCompleteRoute) {
      navigate('/pc-bonus/complete', { replace: true });
    }
  }, [progress, isCompleteRoute, navigate]);

  const handleSubmit = useCallback(
    (isCorrect: boolean) => {
      setLastCorrect(isCorrect);
      navigate('/pc-bonus/feedback', { replace: true });
    },
    [navigate],
  );

  const handleFeedbackContinue = useCallback(() => {
    if (!progress || lastCorrect === null) return;

    if (!lastCorrect) {
      setLastCorrect(null);
      navigate('/pc-bonus', { replace: true });
      return;
    }

    const next = completePcBonus(progress);
    setProgress(next);
    setXpEarned(PC_BONUS_XP);
    navigate('/pc-bonus/complete', { replace: true });
  }, [progress, lastCorrect, navigate]);

  if (!progress) {
    return (
      <div className="daily">
        <p className="home__loading-text">불러오는 중…</p>
      </div>
    );
  }

  const today = getTodaySeoul();
  const alreadyDone = Boolean(
    progress.todayPcBonusCompleted && progress.lastPcBonusDate === today,
  );

  if (isCompleteRoute) {
    return (
      <div className="daily">
        <PcBonusComplete xpEarned={xpEarned} alreadyDone={alreadyDone && xpEarned === 0} />
      </div>
    );
  }

  const question = getPcBonusQuestion();
  const feedbackMessage =
    lastCorrect === null
      ? ''
      : lastCorrect
        ? question.feedbackCorrect
        : question.feedbackWrong;

  return (
    <div className="daily">
      <div className="daily__top">
        <Link to="/home" className="daily__back">
          ← 홈
        </Link>
        <span className="daily__type-badge" style={{ margin: 0 }}>
          +{PC_BONUS_XP} XP
        </span>
      </div>

      <section className="daily__card">
        {isFeedbackRoute && lastCorrect !== null ? (
          <DailyFeedback
            isCorrect={lastCorrect}
            message={feedbackMessage}
            onContinue={handleFeedbackContinue}
            xpAmount={lastCorrect ? PC_BONUS_XP : null}
            continueLabel={lastCorrect ? '보너스 받기' : '다시 풀기'}
          />
        ) : (
          <PcBonusQuestion onSubmit={handleSubmit} />
        )}
      </section>
    </div>
  );
}

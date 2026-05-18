import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  DAILY_TOTAL,
  getDailyPackWithMeta,
  getDailyQuestion,
  type DailyQuestion as DailyQuestionData,
} from '../../lib/daily';
import { effectiveCodeLanguage } from '../../lib/codeLanguage';
import {
  advanceAfterFeedback,
  completeDailyChallenge,
  loadDailySession,
  loadProgress,
  recordDailyAnswer,
  startDailySession,
  type DailySession,
  type GuestProgress,
} from '../../lib/progress';
import DailyComplete from './DailyComplete';
import DailyFeedback from './DailyFeedback';
import DailyQuestion from './DailyQuestion';
import './Daily.css';

function feedbackMessage(question: DailyQuestionData, isCorrect: boolean): string {
  return isCorrect ? question.feedbackCorrect : question.feedbackWrong;
}

type CompleteSnapshot = {
  allCorrect: boolean;
  streakCount: number;
  xpEarned: number;
};

export default function DailyChallenge() {
  const { step: stepParam } = useParams<{ step?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [progress, setProgress] = useState<GuestProgress | null>(null);
  const [session, setSession] = useState<DailySession | null>(null);
  const [completeSnapshot, setCompleteSnapshot] = useState<CompleteSnapshot | null>(
    null,
  );
  const [languageFallbackMessage, setLanguageFallbackMessage] = useState<string | null>(
    null,
  );

  const isCompleteRoute =
    stepParam === 'complete' || location.pathname.endsWith('/complete');
  const isFeedbackRoute = location.pathname.endsWith('/feedback');

  useEffect(() => {
    const p = loadProgress();
    setProgress(p);

    const lang = effectiveCodeLanguage();
    const { usedLanguageFallback } = getDailyPackWithMeta(new Date(), lang);
    if (usedLanguageFallback) {
      setLanguageFallbackMessage(
        '선택한 언어 문제가 부족해 Python 빈칸으로 진행합니다.',
      );
    }

    if (p.todayDailyCompleted && !isCompleteRoute) {
      setCompleteSnapshot({
        allCorrect: p.todayAllCorrect,
        streakCount: p.streakCount,
        xpEarned: p.dailyProgress * 10,
      });
      navigate('/daily/complete', { replace: true });
      return;
    }

    if (!isCompleteRoute) {
      let s = loadDailySession();
      if (!s) s = startDailySession();
      setSession(s);

      if (!stepParam || stepParam === 'complete') {
        const target = s.awaitingFeedback ? s.questionIndex + 1 : s.questionIndex + 1;
        navigate(`/daily/${Math.min(DAILY_TOTAL, Math.max(1, target))}`, {
          replace: true,
        });
      }
    }
  }, [isCompleteRoute, navigate, stepParam]);

  const stepNumber = (() => {
    if (isCompleteRoute) return null;
    const n = Number(stepParam);
    if (Number.isFinite(n) && n >= 1 && n <= DAILY_TOTAL) return n;
    return null;
  })();

  const handleSubmit = useCallback(
    (isCorrect: boolean) => {
      if (!progress || !session || stepNumber === null) return;

      const { progress: nextProgress, session: nextSession } = recordDailyAnswer(
        progress,
        session,
        isCorrect,
      );
      setProgress(nextProgress);
      setSession(nextSession);
      navigate(`/daily/${stepNumber}/feedback`, { replace: true });
    },
    [progress, session, stepNumber, navigate],
  );

  const handleFeedbackContinue = useCallback(() => {
    if (!session || !progress) return;

    if (session.answers.length >= DAILY_TOTAL) {
      const allCorrect = session.answers.every(Boolean);
      const finalProgress = completeDailyChallenge(progress, session);
      setProgress(finalProgress);
      setCompleteSnapshot({
        allCorrect,
        streakCount: finalProgress.streakCount,
        xpEarned: session.xpEarned,
      });
      navigate('/daily/complete', { replace: true });
      return;
    }

    const nextSession = advanceAfterFeedback(session);
    setSession(nextSession);
    navigate(`/daily/${nextSession.questionIndex + 1}`, { replace: true });
  }, [session, progress, navigate]);

  if (isCompleteRoute) {
    const snapshot = completeSnapshot ?? {
      allCorrect: progress?.todayAllCorrect ?? false,
      streakCount: progress?.streakCount ?? 0,
      xpEarned: (progress?.dailyProgress ?? 0) * 10,
    };
    return (
      <div className="daily">
        <DailyComplete
          allCorrect={snapshot.allCorrect}
          streakCount={snapshot.streakCount}
          xpEarned={snapshot.xpEarned}
        />
      </div>
    );
  }

  if (!progress || !session || stepNumber === null) {
    return (
      <div className="daily">
        <p className="home__loading-text">불러오는 중…</p>
      </div>
    );
  }

  const question = getDailyQuestion(stepNumber - 1, new Date(), effectiveCodeLanguage());
  const isCorrect = session.lastAnswerCorrect === true;
  const feedbackText =
    question && session.lastAnswerCorrect !== null
      ? feedbackMessage(question, session.lastAnswerCorrect)
      : '';

  return (
    <div className="daily">
      <div className="daily__top">
        <Link to="/home" className="daily__back">
          ← 홈
        </Link>
        <div className="daily__hearts" aria-label={`하트 ${session.hearts}개`}>
          {Array.from({ length: 5 }, (_, i) => (
            <span
              key={i}
              className={`daily__heart${i < session.hearts ? ' daily__heart--on' : ''}`}
              aria-hidden
            >
              ❤️
            </span>
          ))}
        </div>
      </div>

      <div className="daily__progress" aria-label={`진행 ${stepNumber}/${DAILY_TOTAL}`}>
        {Array.from({ length: DAILY_TOTAL }, (_, i) => (
          <span
            key={i}
            className={`daily__dot${
              i < session.answers.length
                ? ' daily__dot--done'
                : i === stepNumber - 1
                  ? ' daily__dot--current'
                  : ''
            }`}
          />
        ))}
      </div>

      {languageFallbackMessage ? (
        <p className="daily__lang-hint" role="status">
          {languageFallbackMessage}
        </p>
      ) : null}

      <section className="daily__card">
        {isFeedbackRoute && session.awaitingFeedback ? (
          <DailyFeedback
            isCorrect={isCorrect}
            message={feedbackText}
            onContinue={handleFeedbackContinue}
          />
        ) : (
          <DailyQuestion key={stepNumber} step={stepNumber} onSubmit={handleSubmit} />
        )}
      </section>
    </div>
  );
}

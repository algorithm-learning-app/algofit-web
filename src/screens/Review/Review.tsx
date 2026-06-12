import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QuestionView from '../../components/QuestionView';
import DailyFeedback from '../Daily/DailyFeedback';
import { resolveQuestionsByIds, type DailyQuestion } from '../../lib/daily';
import {
  loadProgress,
  recordReviewAnswer,
  type GuestProgress,
} from '../../lib/progress';
import '../Daily/Daily.css';
import './Review.css';

/**
 * 복습 화면(모바일 ReviewScreen 미러): wrongQuestionIds 를 실제 pick/blank 문항으로
 * 해석해 목록으로 보여주고, 다시 풀어 정답이면 wrong→cleared 로 옮긴다.
 * 풀에 없는 스테일 id 는 graceful 하게 제외한다. 오답 풀이 비면 empty state.
 */
export default function Review() {
  const navigate = useNavigate();
  // 마운트 시점의 진행을 읽고, 이후 정답 처리마다 setState 로 갱신한다.
  const [progress, setProgress] = useState<GuestProgress>(() => loadProgress());
  // 재풀이 중인 문항은 별도 state 로 고정한다 — 정답 처리로 풀에서 빠져도
  // 피드백 화면이 사라지지 않도록(파생값으로 두면 정답 시 null 이 된다).
  const [activeQuestion, setActiveQuestion] = useState<DailyQuestion | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);

  // 풀에 실제로 존재하는 오답 문항만 해석한다(입력 순서 유지).
  const wrongQuestions = useMemo<DailyQuestion[]>(
    () => resolveQuestionsByIds(progress.wrongQuestionIds),
    [progress.wrongQuestionIds],
  );

  function backToHome() {
    navigate('/home');
  }

  function startReview(question: DailyQuestion) {
    setActiveQuestion(question);
    setShowFeedback(false);
    setLastCorrect(null);
  }

  function handleSubmit(isCorrect: boolean) {
    if (!activeQuestion) return;
    // 복습 풀만 갱신(정답 → wrong 제거 + cleared 추가). XP·하트는 변동 없음.
    const next = recordReviewAnswer(progress, activeQuestion.id, isCorrect);
    setProgress(next);
    setLastCorrect(isCorrect);
    setShowFeedback(true);
  }

  function handleContinue() {
    // 피드백 닫고 목록으로 복귀. 정답이면 이미 풀에서 빠져 목록이 줄어든다.
    setActiveQuestion(null);
    setShowFeedback(false);
    setLastCorrect(null);
  }

  if (activeQuestion) {
    return (
      <div className="daily">
        <div className="daily__top">
          <button type="button" className="daily__back" onClick={handleContinue}>
            ← 목록
          </button>
          <span className="world__stage-label">복습</span>
        </div>
        <section className="daily__card">
          {showFeedback && lastCorrect !== null ? (
            <DailyFeedback
              isCorrect={lastCorrect}
              message={
                lastCorrect
                  ? activeQuestion.feedbackCorrect
                  : activeQuestion.feedbackWrong
              }
              onContinue={handleContinue}
              xpAmount={null}
              continueLabel={lastCorrect ? '목록으로' : '다시 풀기'}
            />
          ) : (
            <QuestionView
              key={activeQuestion.id}
              question={activeQuestion}
              onSubmit={handleSubmit}
            />
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="daily">
      <div className="daily__top">
        <button type="button" className="daily__back" onClick={backToHome}>
          ✕ 닫기
        </button>
        <span className="world__stage-label">복습</span>
      </div>

      <section className="daily__card">
        {wrongQuestions.length === 0 ? (
          <div className="review__empty">
            <p className="review__empty-icon" aria-hidden>
              ✨
            </p>
            <h2 className="review__empty-title">복습할 오답이 없어요</h2>
            <p className="review__empty-desc">
              Daily나 스테이지에서 틀린 문항이 여기에 쌓여요.
            </p>
            <button type="button" className="btn-primary" onClick={backToHome}>
              홈으로
            </button>
          </div>
        ) : (
          <div className="review">
            <p className="review__count" aria-live="polite">
              복습할 오답 {wrongQuestions.length}개
            </p>
            <ul className="review__list">
              {wrongQuestions.map((q) => (
                <li key={q.id}>
                  <button
                    type="button"
                    className="review__item"
                    onClick={() => startReview(q)}
                  >
                    <span className="review__item-badge">
                      {q.type === 'pick' ? 'Pick' : 'Blank'}
                    </span>
                    <span className="review__item-stem">{q.stem}</span>
                    <span className="review__item-arrow" aria-hidden>
                      →
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

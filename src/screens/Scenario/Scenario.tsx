import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DailyFeedback from '../Daily/DailyFeedback';
import { loadProgress, recordScenarioAnswer } from '../../lib/progress';
import {
  buildScenarioSession,
  isCorrectChoice,
  loadScenarios,
  scenarioCategoryLabel,
  SCENARIO_XP_PER_QUESTION,
  type ScenarioQuestion,
} from '../../lib/scenario';
import '../Daily/Daily.css';
import './Scenario.css';

/**
 * 실전 시나리오 모드: 긴 도메인 지문을 읽고 알맞은 알고리즘 패턴을 고른다.
 * 한 세션 최대 SCENARIO_SESSION_SIZE 문항, 하트 미소모, 정답 시 XP(전역 cleared/wrong 미반영).
 */
export default function Scenario() {
  const navigate = useNavigate();
  const session: ScenarioQuestion[] = useMemo(
    () => buildScenarioSession(loadScenarios()),
    [],
  );

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  function backToHome() {
    navigate('/home');
  }

  function handleSubmit() {
    if (selected === null || showFeedback) return;
    const question = session[index];
    const correct = isCorrectChoice(question, selected);
    recordScenarioAnswer(loadProgress(), correct);
    setLastCorrect(correct);
    setShowFeedback(true);
    if (correct) setCorrectCount((c) => c + 1);
  }

  function handleNext() {
    if (index + 1 >= session.length) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setShowFeedback(false);
  }

  if (session.length === 0) {
    return (
      <div className="daily">
        <div className="daily__top">
          <button type="button" className="daily__back" onClick={backToHome}>
            ✕ 닫기
          </button>
        </div>
        <section className="daily__card">
          <div className="daily-complete">
            <p className="scenario__empty">아직 시나리오가 없어요.</p>
            <button type="button" className="btn-primary" onClick={backToHome}>
              홈으로
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (finished) {
    const total = session.length;
    const allCorrect = correctCount === total;
    return (
      <div className="daily">
        <div className="daily__top">
          <button type="button" className="daily__back" onClick={backToHome}>
            ✕ 닫기
          </button>
        </div>
        <section className="daily__card">
          <div className="daily-complete">
            <p className="daily-complete__icon" aria-hidden>
              🎉
            </p>
            <h2 className="daily-complete__title">
              {allCorrect ? '시나리오 정복!' : '시나리오 완료'}
            </h2>
            <p className="daily-complete__desc">
              {total}문제 중 {correctCount}문제 정답
            </p>
            <p className="daily-feedback__xp">
              +{correctCount * SCENARIO_XP_PER_QUESTION} XP
            </p>
            <button type="button" className="btn-primary" onClick={backToHome}>
              홈으로
            </button>
          </div>
        </section>
      </div>
    );
  }

  const question = session[index];
  const lastStep = index + 1 >= session.length;

  return (
    <div className="daily">
      <div className="daily__top">
        <button type="button" className="daily__back" onClick={backToHome}>
          ✕ 닫기
        </button>
        <span className="world__stage-label">실전 시나리오</span>
      </div>

      <div className="daily__progress" aria-label={`진행 ${index + 1}/${session.length}`}>
        {Array.from({ length: session.length }, (_, i) => (
          <span
            key={i}
            className={`daily__dot${
              i < index
                ? ' daily__dot--done'
                : i === index
                  ? ' daily__dot--current'
                  : ''
            }`}
          />
        ))}
      </div>

      <section className="daily__card">
        {showFeedback ? (
          <DailyFeedback
            isCorrect={lastCorrect}
            message={question.explanation}
            onContinue={handleNext}
            xpAmount={lastCorrect ? SCENARIO_XP_PER_QUESTION : null}
            continueLabel={lastStep ? '결과 보기' : '다음'}
          />
        ) : (
          <div className="scenario">
            <span className="scenario__chip">
              실전 · {scenarioCategoryLabel(question.scenarioCategory)}
            </span>
            <p className="scenario__stem">{question.stem}</p>
            <p className="scenario__prompt">어떤 패턴으로 풀까요?</p>
            <div className="scenario__choices">
              {question.patternChoices.map((choice, i) => (
                <button
                  key={choice.id}
                  type="button"
                  data-testid={`scenario-choice-${i}`}
                  className={`scenario__choice${
                    selected === choice.id ? ' scenario__choice--selected' : ''
                  }`}
                  aria-pressed={selected === choice.id}
                  onClick={() => setSelected(choice.id)}
                >
                  {choice.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn-primary scenario__submit"
              disabled={selected === null}
              onClick={handleSubmit}
            >
              확인
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

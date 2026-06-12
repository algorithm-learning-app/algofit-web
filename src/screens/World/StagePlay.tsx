import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import QuestionView from '../../components/QuestionView';
import DailyFeedback from '../Daily/DailyFeedback';
import {
  completeWorldStage,
  isWorldPlayable,
  loadProgress,
  nodesForWorld,
  STAGE_XP_PER_QUESTION,
  type WorldNodeState,
} from '../../lib/progress';
import { resolveStageQuestions } from '../../content/stageQuestions';
import { worldById } from '../../content/worldStages';
import '../Daily/Daily.css';
import './World.css';

export default function StagePlay() {
  const navigate = useNavigate();
  const { worldId: worldIdParam, stageOrder: stageOrderParam } = useParams<{
    worldId: string;
    stageOrder: string;
  }>();
  const worldIdRaw = Number.parseInt(worldIdParam ?? '', 10);
  const stageOrderRaw = Number.parseInt(stageOrderParam ?? '', 10);
  const worldId = Number.isFinite(worldIdRaw) ? worldIdRaw : NaN;
  const stageOrder = Number.isFinite(stageOrderRaw) ? stageOrderRaw : NaN;

  const progress = useMemo(() => loadProgress(), []);
  const def = worldById(worldId);
  const stage = def?.stages.find((s) => s.order === stageOrder);
  const questions = useMemo(
    () => (stage ? resolveStageQuestions(stage.id) : []),
    [stage],
  );

  const nodes: WorldNodeState[] = nodesForWorld(progress, worldId);
  const nodeState: WorldNodeState =
    stage && stageOrder - 1 < nodes.length ? nodes[stageOrder - 1] : 'locked';
  const locked = !stage || !isWorldPlayable(progress, worldId) || nodeState === 'locked';

  const [index, setIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [complete, setComplete] = useState(false);

  const setSize = questions.length;
  // 스테이지 클리어 보상은 세트 크기와 무관한 정액 XP(모바일 미러).
  const xpEarned = STAGE_XP_PER_QUESTION;

  function backToMap() {
    navigate('/learn');
  }

  function handleSubmit(isCorrect: boolean) {
    setLastCorrect(isCorrect);
    setShowFeedback(true);
  }

  function handleContinue() {
    if (lastCorrect !== true) {
      // 오답 → 같은 문항 재시도.
      setShowFeedback(false);
      setLastCorrect(null);
      return;
    }
    const nextCorrect = correctCount + 1;
    if (nextCorrect < setSize) {
      setCorrectCount(nextCorrect);
      setIndex(nextCorrect);
      setShowFeedback(false);
      setLastCorrect(null);
      return;
    }
    // 세트 전부 정답 → 스테이지 클리어. 클리어 시점의 최신 진행을 다시 읽어 반영한다.
    if (stage) {
      completeWorldStage(loadProgress(), worldId, stage.order);
    }
    setShowFeedback(false);
    setComplete(true);
  }

  if (locked) {
    return (
      <div className="daily">
        <div className="daily__top">
          <button type="button" className="daily__back" onClick={backToMap}>
            ← 맵
          </button>
        </div>
        <section className="daily__card">
          <div className="world__locked">
            <p className="world__locked-icon" aria-hidden>
              🔒
            </p>
            <p className="world__locked-text">
              {stage ? '아직 잠긴 스테이지예요. 앞 스테이지를 먼저 클리어해 주세요!' : '스테이지를 찾을 수 없어요.'}
            </p>
            <button type="button" className="btn-primary" onClick={backToMap}>
              맵으로
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="daily">
        <div className="daily__top">
          <button type="button" className="daily__back" onClick={backToMap}>
            ← 맵
          </button>
        </div>
        <section className="daily__card">
          <p>문항을 불러올 수 없어요.</p>
          <button type="button" className="btn-primary" onClick={backToMap}>
            맵으로
          </button>
        </section>
      </div>
    );
  }

  const question = questions[index];

  return (
    <div className="daily">
      <div className="daily__top">
        <button type="button" className="daily__back" onClick={backToMap}>
          ✕ 닫기
        </button>
        <span className="world__stage-label">
          {worldId}-{stage!.order} · {stage!.title}
        </span>
      </div>

      {!complete && (
        <div className="daily__progress" aria-label={`진행 ${index + 1}/${setSize}`}>
          {Array.from({ length: setSize }, (_, i) => (
            <span
              key={i}
              className={`daily__dot${
                i < correctCount
                  ? ' daily__dot--done'
                  : i === index
                    ? ' daily__dot--current'
                    : ''
              }`}
            />
          ))}
        </div>
      )}

      <section className="daily__card">
        {complete ? (
          <div className="daily-complete">
            <p className="daily-complete__icon" aria-hidden>
              🎉
            </p>
            <h2 className="daily-complete__title">스테이지 클리어!</h2>
            <p className="daily-complete__desc">{stage!.title} 완료</p>
            <p className="daily-feedback__xp">+{xpEarned} XP</p>
            <button type="button" className="btn-primary" onClick={backToMap}>
              맵으로 돌아가기
            </button>
          </div>
        ) : showFeedback && lastCorrect !== null ? (
          <DailyFeedback
            isCorrect={lastCorrect}
            message={lastCorrect ? question.feedbackCorrect : question.feedbackWrong}
            onContinue={handleContinue}
            xpAmount={lastCorrect ? STAGE_XP_PER_QUESTION : null}
            continueLabel={lastCorrect ? '다음' : '다시 풀기'}
          />
        ) : (
          <QuestionView key={`${question.id}_${index}`} question={question} onSubmit={handleSubmit} />
        )}
      </section>
    </div>
  );
}

import { describe, expect, it, beforeEach } from 'vitest';
import {
  buildScenarioSession,
  isCorrectChoice,
  loadScenarios,
  parseScenarios,
  scenarioCategoryLabel,
  SCENARIO_SESSION_SIZE,
  SCENARIO_XP_PER_QUESTION,
} from './scenario';
import scenarioBundle from '../content/scenario.json';
import { loadProgress, recordScenarioAnswer } from './progress';

const STORAGE_KEY = 'algofit:guestProgress';

describe('parseScenarios / loadScenarios', () => {
  it('번들을 기대 문항 수로 파싱한다', () => {
    const expected = scenarioBundle.questions.length;
    expect(expected).toBeGreaterThan(0);
    expect(parseScenarios(JSON.stringify(scenarioBundle))).toHaveLength(expected);
    expect(loadScenarios()).toHaveLength(expected);
  });

  it('문항 필드를 채워서 파싱한다', () => {
    const [first] = loadScenarios();
    expect(first.id).toBeTruthy();
    expect(first.stem).toBeTruthy();
    expect(first.patternChoices.length).toBeGreaterThan(0);
    expect(first.primaryPatternIds.length).toBeGreaterThan(0);
  });

  it('id 가 없는(malformed) 항목은 건너뛰고 정상 항목만 파싱한다', () => {
    const valid = scenarioBundle.questions[0];
    const malformed = { ...valid, id: undefined };
    const parsed = parseScenarios(
      JSON.stringify({ questions: [malformed, valid] }),
    );
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe(valid.id);
    // "undefined" 리터럴 id 가 생기지 않는다.
    expect(parsed.some((q) => q.id === 'undefined')).toBe(false);
  });
});

describe('buildScenarioSession', () => {
  const all = loadScenarios();

  it('시드가 같으면 결정적이다', () => {
    const a = buildScenarioSession(all, SCENARIO_SESSION_SIZE, 1234);
    const b = buildScenarioSession(all, SCENARIO_SESSION_SIZE, 1234);
    expect(a.map((q) => q.id)).toEqual(b.map((q) => q.id));
  });

  it('다른 시드는 (대개) 다른 순서를 만든다', () => {
    const a = buildScenarioSession(all, SCENARIO_SESSION_SIZE, 1);
    const b = buildScenarioSession(all, SCENARIO_SESSION_SIZE, 999);
    expect(a.map((q) => q.id)).not.toEqual(b.map((q) => q.id));
  });

  it('세션 크기를 존중하고 풀 크기로 클램프한다', () => {
    expect(buildScenarioSession(all, 5, 1)).toHaveLength(
      Math.min(5, all.length),
    );
    expect(buildScenarioSession(all, all.length + 100, 1)).toHaveLength(
      all.length,
    );
  });

  it('count<=0 이면 빈 세션을 반환한다', () => {
    expect(buildScenarioSession(all, 0, 1)).toEqual([]);
    expect(buildScenarioSession(all, -3, 1)).toEqual([]);
  });

  it('기본 count 는 SCENARIO_SESSION_SIZE 다', () => {
    expect(buildScenarioSession(all, undefined, 1)).toHaveLength(
      Math.min(SCENARIO_SESSION_SIZE, all.length),
    );
  });
});

describe('isCorrectChoice', () => {
  it('primaryPatternIds 에 들어있으면 정답', () => {
    const q = loadScenarios()[0];
    const correctId = q.primaryPatternIds[0];
    expect(isCorrectChoice(q, correctId)).toBe(true);
    const wrong = q.patternChoices
      .map((c) => c.id)
      .find((id) => !q.primaryPatternIds.includes(id))!;
    expect(isCorrectChoice(q, wrong)).toBe(false);
  });
});

describe('scenarioCategoryLabel', () => {
  it('알려진 카테고리를 한국어로 매핑하고 미지는 기본 라벨', () => {
    expect(scenarioCategoryLabel('aggregation')).toBe('집계·통계');
    expect(scenarioCategoryLabel('matching')).toBe('매칭·추천');
    expect(scenarioCategoryLabel('unknown_xyz')).toBe('시나리오');
  });
});

describe('recordScenarioAnswer (XP 전용)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('정답이면 SCENARIO_XP_PER_QUESTION 만큼 XP, 오답이면 0', () => {
    const base = loadProgress();
    const afterCorrect = recordScenarioAnswer(base, true);
    expect(afterCorrect.xp).toBe(base.xp + SCENARIO_XP_PER_QUESTION);

    const afterWrong = recordScenarioAnswer(afterCorrect, false);
    expect(afterWrong.xp).toBe(afterCorrect.xp);
  });

  it('clearedQuestionIds / wrongQuestionIds 를 건드리지 않는다', () => {
    // 기존 blob 에 복습 풀 필드가 있어도 보존하되 시나리오가 추가하지 않음을 검증.
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 6,
        xp: 0,
        level: 1,
        xpToNextLevel: 100,
        clearedQuestionIds: ['pick_a'],
        wrongQuestionIds: ['blank_b'],
      }),
    );
    const base = loadProgress();
    recordScenarioAnswer(base, true);
    recordScenarioAnswer(base, false);

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as Record<
      string,
      unknown
    >;
    // 기존 풀은 그대로 보존되며 시나리오 답안이 새 id 를 추가하지 않는다.
    expect(saved.clearedQuestionIds).toEqual(['pick_a']);
    expect(saved.wrongQuestionIds).toEqual(['blank_b']);
  });
});

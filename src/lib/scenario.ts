import scenarioBundle from '../content/scenario.json';

/**
 * 실전 시나리오(`scenario_map`) 문항 모델 — 모바일 ScenarioQuestion 미러.
 * 긴 도메인 지문을 읽고 알맞은 알고리즘 패턴을 고르는 매핑 훈련.
 * 콘텐츠: `src/content/scenario.json`.
 */
export type ScenarioPatternChoice = {
  id: string;
  label: string;
  /**
   * 이 선택지가 가리키는 패턴 태그(array, hash, bfs ...). 정답 판정엔 쓰지 않고
   * 해설·통계용. 정답 여부는 ScenarioQuestion.primaryPatternIds 로 판정한다.
   */
  patternTag: string;
};

export type ScenarioQuestion = {
  id: string;
  stem: string;
  scenarioCategory: string;
  difficulty: number;
  patternChoices: ScenarioPatternChoice[];
  /** 정답 선택지 id 목록(1개 이상). 고른 선택지가 이 안에 있으면 정답. */
  primaryPatternIds: string[];
  explanation: string;
  tags: string[];
  tone: string;
};

/** 실전 시나리오 1문항 정답 시 XP. Daily(10)보다 지문이 길고 난도가 있어 약간 높게. */
export const SCENARIO_XP_PER_QUESTION = 15;

/** 한 세션 문항 수(스펙: 3~5문항). 풀이 길이가 길어 5로 둔다. */
export const SCENARIO_SESSION_SIZE = 5;

function parseChoice(raw: unknown): ScenarioPatternChoice {
  const o = (raw ?? {}) as Record<string, unknown>;
  return {
    id: String(o.id),
    label: String(o.label),
    patternTag: typeof o.patternTag === 'string' ? o.patternTag : '',
  };
}

function parseQuestion(raw: unknown): ScenarioQuestion {
  const o = (raw ?? {}) as Record<string, unknown>;
  return {
    id: String(o.id),
    stem: String(o.stem),
    scenarioCategory:
      typeof o.scenarioCategory === 'string' ? o.scenarioCategory : '',
    difficulty: typeof o.difficulty === 'number' ? Math.trunc(o.difficulty) : 1,
    patternChoices: Array.isArray(o.patternChoices)
      ? o.patternChoices.map(parseChoice)
      : [],
    primaryPatternIds: Array.isArray(o.primaryPatternIds)
      ? o.primaryPatternIds.map((e) => String(e))
      : [],
    explanation: typeof o.explanation === 'string' ? o.explanation : '',
    tags: Array.isArray(o.tags) ? o.tags.map((e) => String(e)) : [],
    tone: typeof o.tone === 'string' ? o.tone : 'neutral',
  };
}

/** scenario.json 번들 문자열을 파싱한다(모바일 parseScenarios 미러). */
export function parseScenarios(jsonStr: string): ScenarioQuestion[] {
  const data = JSON.parse(jsonStr) as Record<string, unknown>;
  const questions = Array.isArray(data.questions) ? data.questions : [];
  return questions.map(parseQuestion);
}

/** 번들에서 시나리오 전체를 로드한다. */
export function loadScenarios(): ScenarioQuestion[] {
  const questions = Array.isArray(
    (scenarioBundle as { questions?: unknown }).questions,
  )
    ? (scenarioBundle as { questions: unknown[] }).questions
    : [];
  return questions.map(parseQuestion);
}

/** 고른 선택지 id 가 정답 집합(primaryPatternIds)에 들어있으면 정답. */
export function isCorrectChoice(
  question: ScenarioQuestion,
  choiceId: string,
): boolean {
  return question.primaryPatternIds.includes(choiceId);
}

/** 시드 기반 결정적 PRNG(daily.ts 와 동일 mulberry32). */
function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * all 에서 count 개를 골라 한 세션을 만든다(모바일 buildScenarioSession 미러).
 * - count<=0 이면 빈 세션, 풀 크기를 넘으면 풀 크기로 클램프.
 * - seed 가 주어지면 셔플이 결정적이라 테스트에서 재현 가능하다.
 *   seed 가 없으면 Math.random 기반으로 매번 섞는다.
 */
export function buildScenarioSession(
  all: ScenarioQuestion[],
  count: number = SCENARIO_SESSION_SIZE,
  seed?: number,
): ScenarioQuestion[] {
  if (count <= 0) return [];
  const pool = [...all];
  const rng = seed === undefined ? Math.random : mulberry32(seed);
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const take = Math.min(count, pool.length);
  return pool.slice(0, take);
}

/** 시나리오 카테고리 → 한국어 라벨(모바일 scenarioCategoryLabel 미러). */
export function scenarioCategoryLabel(category: string): string {
  switch (category) {
    case 'logistics':
      return '물류·경로';
    case 'matching':
      return '매칭·추천';
    case 'scheduling':
      return '스케줄링';
    case 'search_filter':
      return '검색·필터';
    case 'aggregation':
      return '집계·통계';
    case 'limits_security':
      return '제한·보안';
    case 'inventory':
      return '재고·잔여';
    case 'navigation':
      return '탐색·지도';
    default:
      return '시나리오';
  }
}

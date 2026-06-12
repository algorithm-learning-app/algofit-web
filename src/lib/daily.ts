import pickBundle from '../content/pick.json';
import blankBundle from '../content/blank.json';
import { DEFAULT_CODE_LANGUAGE, normalizeCodeLanguage } from './codeLanguage';

export type PickQuestion = {
  id: string;
  type: 'pick';
  version: number;
  language: string;
  stem: string;
  tags: string[];
  difficulty: number;
  choices: Array<{ id: string; label: string }>;
  correctChoiceId: string;
  explanation: string;
  feedbackCorrect: string;
  feedbackWrong: string;
};

export type BlankSlot = {
  id: string;
  correctAnswers: string[];
  choices: string[];
};

export type BlankQuestion = {
  id: string;
  type: 'blank';
  version: number;
  language: string;
  stem: string;
  tags: string[];
  difficulty: number;
  codeTemplate: string;
  blanks: BlankSlot[];
  explanation: string;
  feedbackCorrect: string;
  feedbackWrong: string;
};

export type DailyQuestion = PickQuestion | BlankQuestion;

export type DailyPack = {
  id: string;
  title: string;
  questions: DailyQuestion[];
};

export type DailyComposeResult = {
  pack: DailyPack;
  usedLanguageFallback: boolean;
};

export const DAILY_TOTAL = 5;
export const DAILY_PICK_COUNT = 3;
export const DAILY_BLANK_COUNT = 2;
export const DAILY_XP_PER_QUESTION = 10;

const DEFAULT_FEEDBACK_CORRECT = '정답이에요!';
const DEFAULT_FEEDBACK_WRONG = '아쉬워요. 다시 한번 생각해보세요.';

type QuestionPools = { picks: PickQuestion[]; blanks: BlankQuestion[] };

let cachedPack: DailyPack | null = null;
let cachedPackDateKey: string | null = null;
let cachedPackLanguage: string | null = null;

/** Asia/Seoul calendar date `YYYY-MM-DD`. */
export function seoulDateKey(reference = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(reference);
}

export function seoulDateSeed(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  return y * 10000 + m * 100 + d;
}

function withFeedback<T extends PickQuestion | BlankQuestion>(q: T): T {
  return {
    ...q,
    feedbackCorrect: q.feedbackCorrect ?? DEFAULT_FEEDBACK_CORRECT,
    feedbackWrong: q.feedbackWrong ?? DEFAULT_FEEDBACK_WRONG,
  };
}

export function loadQuestionPools(): QuestionPools {
  const picks = (pickBundle.questions as PickQuestion[]).map(withFeedback);
  const blanks = (blankBundle.questions as BlankQuestion[]).map(withFeedback);
  return { picks, blanks };
}

export function filterBlanksByLanguage(
  blanks: BlankQuestion[],
  preferredLanguage: string,
): BlankQuestion[] {
  const lang = normalizeCodeLanguage(preferredLanguage);
  return blanks.filter((q) => q.language === lang);
}

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleFrom<T>(pool: T[], count: number, rng: () => number): T[] {
  if (pool.length === 0) return [];
  if (pool.length <= count) return [...pool];
  const indices = pool.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, count).map((i) => pool[i]);
}

export function composeDailyPack(
  pools: QuestionPools,
  dateKey: string,
  preferredLanguage = DEFAULT_CODE_LANGUAGE,
): DailyComposeResult {
  const rng = mulberry32(seoulDateSeed(dateKey));
  const lang = normalizeCodeLanguage(preferredLanguage);
  const picks = sampleFrom(pools.picks, DAILY_PICK_COUNT, rng);

  let blankPool = filterBlanksByLanguage(pools.blanks, lang);
  let usedLanguageFallback = false;
  if (blankPool.length < DAILY_BLANK_COUNT && lang !== DEFAULT_CODE_LANGUAGE) {
    blankPool = filterBlanksByLanguage(pools.blanks, DEFAULT_CODE_LANGUAGE);
    usedLanguageFallback = true;
  }

  const blanks = sampleFrom(blankPool, DAILY_BLANK_COUNT, rng);
  const questions = [...picks, ...blanks].map((q) =>
    withShuffledChoices(q, mulberry32(choiceShuffleSeed(dateKey, q.id))),
  );
  return {
    pack: {
      id: `daily_${dateKey.replaceAll('-', '_')}`,
      title: '오늘의 챌린지',
      questions,
    },
    usedLanguageFallback,
  };
}

/** 날짜·문항별로 안정적인 선택지 순서 시드. */
export function choiceShuffleSeed(scope: string, questionId: string): number {
  let hash = 0;
  const key = `${scope}:${questionId}`;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

function shuffleArray<T>(items: T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** 선택지 순서만 섞고 정답 id/문자열은 유지한다. */
export function withShuffledChoices(q: DailyQuestion, rng: () => number): DailyQuestion {
  if (q.type === 'pick') {
    return {
      ...q,
      choices: shuffleArray(q.choices, rng),
    };
  }
  return {
    ...q,
    blanks: q.blanks.map((slot) => ({
      ...slot,
      choices: shuffleArray(slot.choices, rng),
    })),
  };
}

export function getDailyPack(
  reference = new Date(),
  preferredLanguage = DEFAULT_CODE_LANGUAGE,
): DailyPack {
  return getDailyPackWithMeta(reference, preferredLanguage).pack;
}

export function getDailyPackWithMeta(
  reference = new Date(),
  preferredLanguage = DEFAULT_CODE_LANGUAGE,
): DailyComposeResult {
  const lang = normalizeCodeLanguage(preferredLanguage);
  const dateKey = seoulDateKey(reference);
  if (cachedPack && cachedPackDateKey === dateKey && cachedPackLanguage === lang) {
    return { pack: cachedPack, usedLanguageFallback: false };
  }
  const result = composeDailyPack(loadQuestionPools(), dateKey, lang);
  cachedPack = result.pack;
  cachedPackDateKey = dateKey;
  cachedPackLanguage = lang;
  return result;
}

/** 테스트에서 캐시 초기화 */
export function resetDailyPackCacheForTest(): void {
  cachedPack = null;
  cachedPackDateKey = null;
  cachedPackLanguage = null;
}

export function getDailyQuestion(
  index: number,
  reference = new Date(),
  preferredLanguage = DEFAULT_CODE_LANGUAGE,
): DailyQuestion | undefined {
  return getDailyPack(reference, preferredLanguage).questions[index];
}

/**
 * id 로 pick/blank 풀에서 단일 문항을 찾는다(모바일 getQuestionById 미러).
 * 풀에 없는 id(스테일/미지)는 null 을 반환한다.
 */
export function getQuestionById(id: string): DailyQuestion | null {
  const { picks, blanks } = loadQuestionPools();
  return picks.find((q) => q.id === id) ?? blanks.find((q) => q.id === id) ?? null;
}

/**
 * id 목록을 실제 pick/blank 문항으로 해석한다. 풀에 존재하는 id 만 입력 순서대로 반환한다
 * (스테일/미지 id 는 graceful 하게 무시 — 복습 화면 resolver).
 */
export function resolveQuestionsByIds(ids: string[]): DailyQuestion[] {
  const { picks, blanks } = loadQuestionPools();
  const byId = new Map<string, DailyQuestion>();
  for (const q of picks) byId.set(q.id, q);
  for (const q of blanks) byId.set(q.id, q);
  const out: DailyQuestion[] = [];
  for (const id of ids) {
    const found = byId.get(id);
    if (found) out.push(found);
  }
  return out;
}

export function isPickQuestion(q: DailyQuestion): q is PickQuestion {
  return q.type === 'pick';
}

export function isBlankQuestion(q: DailyQuestion): q is BlankQuestion {
  return q.type === 'blank';
}

export function checkPickAnswer(q: PickQuestion, choiceId: string): boolean {
  return choiceId === q.correctChoiceId;
}

export function checkBlankAnswer(
  q: BlankQuestion,
  selections: Record<string, string>,
): boolean {
  return q.blanks.every((slot) => {
    const picked = selections[slot.id];
    if (!picked) return false;
    return slot.correctAnswers.includes(picked);
  });
}

export function renderCodeWithSelections(
  template: string,
  selections: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, id: string) => {
    const value = selections[id];
    return value ?? `{{${id}}}`;
  });
}

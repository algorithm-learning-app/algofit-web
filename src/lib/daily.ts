import pickBundle from '../content/pick.json';
import blankBundle from '../content/blank.json';

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

export const DAILY_TOTAL = 5;
export const DAILY_PICK_COUNT = 3;
export const DAILY_BLANK_COUNT = 2;
export const DAILY_XP_PER_QUESTION = 10;

const DEFAULT_FEEDBACK_CORRECT = '정답이에요!';
const DEFAULT_FEEDBACK_WRONG = '아쉬워요. 다시 한번 생각해보세요.';

type QuestionPools = { picks: PickQuestion[]; blanks: BlankQuestion[] };

let cachedPack: DailyPack | null = null;
let cachedPackDateKey: string | null = null;

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

function loadQuestionPools(): QuestionPools {
  const picks = (pickBundle.questions as PickQuestion[]).map(withFeedback);
  const blanks = (blankBundle.questions as BlankQuestion[]).map(withFeedback);
  return { picks, blanks };
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
  if (pool.length <= count) return [...pool];
  const indices = pool.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, count).map((i) => pool[i]);
}

export function composeDailyPack(pools: QuestionPools, dateKey: string): DailyPack {
  const rng = mulberry32(seoulDateSeed(dateKey));
  const picks = sampleFrom(pools.picks, DAILY_PICK_COUNT, rng);
  const blanks = sampleFrom(pools.blanks, DAILY_BLANK_COUNT, rng);
  return {
    id: `daily_${dateKey.replaceAll('-', '_')}`,
    title: '오늘의 챌린지',
    questions: [...picks, ...blanks],
  };
}

export function getDailyPack(reference = new Date()): DailyPack {
  const dateKey = seoulDateKey(reference);
  if (cachedPack && cachedPackDateKey === dateKey) {
    return cachedPack;
  }
  const pack = composeDailyPack(loadQuestionPools(), dateKey);
  cachedPack = pack;
  cachedPackDateKey = dateKey;
  return pack;
}

/** 테스트에서 캐시 초기화 */
export function resetDailyPackCacheForTest(): void {
  cachedPack = null;
  cachedPackDateKey = null;
}

export function getDailyQuestion(index: number, reference = new Date()): DailyQuestion | undefined {
  return getDailyPack(reference).questions[index];
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

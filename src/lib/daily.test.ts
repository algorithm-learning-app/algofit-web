import { describe, expect, it } from 'vitest';
import {
  checkPickAnswer,
  composeDailyPack,
  DAILY_BLANK_COUNT,
  DAILY_PICK_COUNT,
  DAILY_TOTAL,
  isBlankQuestion,
  isPickQuestion,
  loadQuestionPools,
  resetDailyPackCacheForTest,
  seoulDateKey,
  withShuffledChoices,
} from './daily';

describe('daily composition', () => {
  it('구성은 pick 3 + blank 2 = 5문항', () => {
    resetDailyPackCacheForTest();
    const pools = loadQuestionPools();
    const { pack } = composeDailyPack(pools, '2026-05-19');

    expect(pack.questions).toHaveLength(DAILY_TOTAL);
    const pickCount = pack.questions.filter(isPickQuestion).length;
    const blankCount = pack.questions.filter(isBlankQuestion).length;
    expect(pickCount).toBe(DAILY_PICK_COUNT);
    expect(blankCount).toBe(DAILY_BLANK_COUNT);
  });

  it('셔플 후에도 correctChoiceId로 채점한다', () => {
    const pools = loadQuestionPools();
    const sample = pools.picks[0];
    if (!isPickQuestion(sample)) {
      throw new Error('expected pick sample');
    }
    const shuffled = withShuffledChoices(sample, () => 0.99);
    if (!isPickQuestion(shuffled)) {
      throw new Error('expected pick after shuffle');
    }
    expect(checkPickAnswer(shuffled, shuffled.correctChoiceId)).toBe(true);
    const wrong = shuffled.choices.find((c) => c.id !== shuffled.correctChoiceId)!;
    expect(checkPickAnswer(shuffled, wrong.id)).toBe(false);
  });

  it('composeDailyPack은 일부 pick에서 정답이 1번이 아닐 수 있다', () => {
    const pools = loadQuestionPools();
    const { pack } = composeDailyPack(pools, '2026-05-19');
    const indices = pack.questions
      .filter(isPickQuestion)
      .map((q) => q.choices.findIndex((c) => c.id === q.correctChoiceId));
    expect(indices.some((i) => i !== 0)).toBe(true);
  });

  it('같은 서울 날짜에 동일한 문항 ID 순서', () => {
    const pools = loadQuestionPools();
    const dateKey = seoulDateKey(new Date('2026-05-18T20:00:00Z'));
    const a = composeDailyPack(pools, dateKey).pack;
    const b = composeDailyPack(pools, dateKey).pack;
    expect(a.questions.map((q) => q.id)).toEqual(b.questions.map((q) => q.id));
  });
});

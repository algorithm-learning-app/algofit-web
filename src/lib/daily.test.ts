import { describe, expect, it } from 'vitest';
import {
  composeDailyPack,
  DAILY_BLANK_COUNT,
  DAILY_PICK_COUNT,
  DAILY_TOTAL,
  isBlankQuestion,
  isPickQuestion,
  loadQuestionPools,
  resetDailyPackCacheForTest,
  seoulDateKey,
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

  it('같은 서울 날짜에 동일한 문항 ID 순서', () => {
    const pools = loadQuestionPools();
    const dateKey = seoulDateKey(new Date('2026-05-18T20:00:00Z'));
    const a = composeDailyPack(pools, dateKey).pack;
    const b = composeDailyPack(pools, dateKey).pack;
    expect(a.questions.map((q) => q.id)).toEqual(b.questions.map((q) => q.id));
  });
});

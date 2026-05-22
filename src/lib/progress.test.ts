import { describe, expect, it, beforeEach } from 'vitest';
import {
  completeDailyChallenge,
  DAILY_PERFECT_BONUS_XP,
  loadProgress,
  recordDailyAnswer,
  startDailySession,
} from './progress';
import { DAILY_TOTAL } from './daily';

describe('progress daily hearts', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('Daily 오답 시 하트를 소모하지 않는다', () => {
    const progress = loadProgress();
    const session = startDailySession();

    const { progress: nextProgress, session: nextSession } = recordDailyAnswer(
      progress,
      session,
      false,
    );

    expect(nextSession.hearts).toBe(5);
    expect(nextProgress.hearts).toBe(5);
  });
});

describe('progress persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('localStorage에 저장한 XP·스트릭이 loadProgress로 복원된다', () => {
    let progress = loadProgress();
    let session = startDailySession();
    for (let i = 0; i < 5; i += 1) {
      const result = recordDailyAnswer(progress, session, true);
      progress = result.progress;
      session = result.session;
    }
    completeDailyChallenge(progress, session);

    const saved = loadProgress();
    expect(saved.xp).toBeGreaterThan(0);
    expect(saved.streakCount).toBe(1);
    expect(saved.todayAllCorrect).toBe(true);

    localStorage.removeItem('algofit:dailySession');
    const reloaded = loadProgress();
    expect(reloaded.xp).toBe(saved.xp);
    expect(reloaded.streakCount).toBe(saved.streakCount);
  });
});

describe('daily streak — 친화적 규칙', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('5/5 정답: streak +1, 보너스 XP 추가', () => {
    let progress = loadProgress();
    let session = startDailySession();
    const xpBefore = progress.xp;

    for (let i = 0; i < DAILY_TOTAL; i += 1) {
      const result = recordDailyAnswer(progress, session, true);
      progress = result.progress;
      session = result.session;
    }
    const final_ = completeDailyChallenge(progress, session);

    expect(final_.streakCount).toBe(1);
    expect(final_.todayAllCorrect).toBe(true);
    expect(final_.xp - xpBefore).toBe(10 * DAILY_TOTAL + DAILY_PERFECT_BONUS_XP);
  });

  it('부분 정답: 챌린지 완료만으로 streak +1, 보너스 없음', () => {
    let progress = loadProgress();
    let session = startDailySession();
    const xpBefore = progress.xp;

    for (let i = 0; i < DAILY_TOTAL; i += 1) {
      const isCorrect = i < 2;
      const result = recordDailyAnswer(progress, session, isCorrect);
      progress = result.progress;
      session = result.session;
    }
    const final_ = completeDailyChallenge(progress, session);

    expect(final_.streakCount).toBe(1);
    expect(final_.todayAllCorrect).toBe(false);
    expect(final_.xp - xpBefore).toBe(10 * DAILY_TOTAL);
  });

  it('전부 오답이어도 챌린지 완료 시 streak +1', () => {
    let progress = loadProgress();
    let session = startDailySession();

    for (let i = 0; i < DAILY_TOTAL; i += 1) {
      const result = recordDailyAnswer(progress, session, false);
      progress = result.progress;
      session = result.session;
    }
    const final_ = completeDailyChallenge(progress, session);

    expect(final_.streakCount).toBe(1);
    expect(final_.todayAllCorrect).toBe(false);
  });
});

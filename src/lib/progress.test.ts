import { describe, expect, it, beforeEach } from 'vitest';
import {
  completeDailyChallenge,
  loadProgress,
  recordDailyAnswer,
  startDailySession,
} from './progress';

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

    localStorage.removeItem('algofit:dailySession');
    const reloaded = loadProgress();
    expect(reloaded.xp).toBe(saved.xp);
    expect(reloaded.streakCount).toBe(saved.streakCount);
  });
});

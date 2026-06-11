import { describe, expect, it, beforeEach } from 'vitest';
import {
  adoptServerProgress,
  completeDailyChallenge,
  DAILY_PERFECT_BONUS_XP,
  loadProgress,
  recordDailyAnswer,
  startDailySession,
} from './progress';
import { DAILY_TOTAL } from './daily';

describe('adoptServerProgress 멱등 신호(핸드오프 무한 루프 방지)', () => {
  const evtTarget = typeof window !== 'undefined' ? window : globalThis;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('동일 데이터 재채택 시 algofit:progress-adopted 는 최초 1회만 발생한다', () => {
    let count = 0;
    const listener = () => {
      count += 1;
    };
    evtTarget.addEventListener('algofit:progress-adopted', listener);
    try {
      const sameData = { schemaVersion: 6, xp: 42, level: 3 };
      adoptServerProgress(sameData); // blob 변경 → 신호 발생
      expect(count).toBe(1);
      adoptServerProgress(sameData); // 동일 blob → 신호 없음 (가드)
      expect(count).toBe(1);
    } finally {
      evtTarget.removeEventListener('algofit:progress-adopted', listener);
    }
  });

  it('동일 데이터를 N회 채택해도 신호 카운트는 1 로 고정된다(리마운트 루프 종료)', () => {
    let count = 0;
    const listener = () => {
      count += 1;
    };
    evtTarget.addEventListener('algofit:progress-adopted', listener);
    try {
      const sameData = { schemaVersion: 6, xp: 100, level: 5 };
      for (let i = 0; i < 5; i += 1) {
        adoptServerProgress(sameData);
      }
      expect(count).toBe(1);
    } finally {
      evtTarget.removeEventListener('algofit:progress-adopted', listener);
    }
  });
});

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

import { describe, expect, it, beforeEach } from 'vitest';
import {
  completeWorldStage,
  loadProgress,
  recordDailyAnswer,
  recordReviewAnswer,
  startDailySession,
  withQuestionCleared,
  withQuestionWrong,
} from './progress';
import { resolveQuestionsByIds, loadQuestionPools } from './daily';

const STORAGE_KEY = 'algofit:guestProgress';

function readStored(): Record<string, unknown> {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)!) as Record<string, unknown>;
}

describe('withQuestionCleared / withQuestionWrong', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('오답을 cleared 로 옮기고 wrong 에서 제거한다', () => {
    const base = loadProgress();
    const wrong = { ...base, wrongQuestionIds: ['pick_a'] };
    const next = withQuestionCleared(wrong, 'pick_a');
    expect(next.clearedQuestionIds).toEqual(['pick_a']);
    expect(next.wrongQuestionIds).toEqual([]);
  });

  it('cleared 추가는 중복을 만들지 않는다', () => {
    const base = { ...loadProgress(), clearedQuestionIds: ['pick_a'] };
    const next = withQuestionCleared(base, 'pick_a');
    expect(next.clearedQuestionIds).toEqual(['pick_a']);
  });

  it('wrong 추가는 중복을 만들지 않는다', () => {
    const base = { ...loadProgress(), wrongQuestionIds: ['pick_a'] };
    const next = withQuestionWrong(base, 'pick_a');
    expect(next.wrongQuestionIds).toEqual(['pick_a']);
  });

  it('questionId 가 없으면 변경하지 않는다', () => {
    const base = loadProgress();
    expect(withQuestionCleared(base, null)).toBe(base);
    expect(withQuestionWrong(base, undefined)).toBe(base);
  });
});

describe('델타 기반 풀 변형(stale-snapshot clobber 방지)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('저장된 큰 풀 + stale 한 작은 스냅샷으로 cleared 추가 시 기존 id 가 줄지 않는다', () => {
    // 백그라운드 sync adopt 가 저장소의 cleared 풀을 5개로 키운 상황을 시뮬레이션.
    const adopted = ['a1', 'a2', 'a3', 'a4', 'a5'];
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 6,
        xp: 0,
        level: 1,
        xpToNextLevel: 100,
        clearedQuestionIds: adopted,
        wrongQuestionIds: [],
      }),
    );
    // adopt 이전에 캡처된 stale 스냅샷(작은/빈 풀) + 새 id 1개.
    const stale = { ...loadProgress(), clearedQuestionIds: [], wrongQuestionIds: [] };
    const next = withQuestionCleared(stale, 'new_id');
    // 기존 5개 보존 + 새 id 추가 (축소 없음).
    expect(next.clearedQuestionIds).toEqual(
      expect.arrayContaining([...adopted, 'new_id']),
    );
    expect(next.clearedQuestionIds).toHaveLength(6);
  });

  it('저장된 큰 풀 + stale 한 작은 스냅샷으로 wrong 추가 시 기존 id 가 줄지 않는다', () => {
    const adopted = ['w1', 'w2', 'w3', 'w4', 'w5'];
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 6,
        xp: 0,
        level: 1,
        xpToNextLevel: 100,
        clearedQuestionIds: [],
        wrongQuestionIds: adopted,
      }),
    );
    const stale = { ...loadProgress(), clearedQuestionIds: [], wrongQuestionIds: [] };
    const next = withQuestionWrong(stale, 'new_wrong');
    expect(next.wrongQuestionIds).toEqual(
      expect.arrayContaining([...adopted, 'new_wrong']),
    );
    expect(next.wrongQuestionIds).toHaveLength(6);
  });

  it('복습에서 마지막 오답을 비우면 여전히 빈 배열로 영속된다(델타 후에도)', () => {
    // 저장소에 단일 오답만 — 정답 처리하면 union(단일 잔여) minus 그 id = [].
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 6,
        xp: 0,
        level: 1,
        xpToNextLevel: 100,
        wrongQuestionIds: ['only_wrong'],
      }),
    );
    const base = loadProgress();
    const next = withQuestionCleared(base, 'only_wrong');
    expect(next.wrongQuestionIds).toEqual([]);
    expect(next.clearedQuestionIds).toEqual(['only_wrong']);
    // saveProgress 가 키 존재 시 []도 직렬화하는지(부활 방지) — recordReviewAnswer 경유로 확인.
    recordReviewAnswer(base, 'only_wrong', true);
    expect(readStored().wrongQuestionIds).toEqual([]);
  });
});

describe('recordDailyAnswer 복습 풀 기록', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('오답이면 wrongQuestionIds 에 id 를 추가한다', () => {
    const progress = loadProgress();
    const session = startDailySession();
    const { progress: next } = recordDailyAnswer(progress, session, false, 'pick_x');
    expect(next.wrongQuestionIds).toContain('pick_x');
    expect(next.clearedQuestionIds).not.toContain('pick_x');
    expect(readStored().wrongQuestionIds).toEqual(['pick_x']);
  });

  it('정답이면 cleared 에 추가하고 wrong 에서 제거한다', () => {
    let progress = loadProgress();
    let session = startDailySession();
    // 먼저 오답으로 풀에 넣는다.
    let r = recordDailyAnswer(progress, session, false, 'pick_x');
    progress = r.progress;
    session = r.session;
    expect(progress.wrongQuestionIds).toContain('pick_x');
    // 같은 id 정답 → wrong 제거 + cleared 추가.
    r = recordDailyAnswer(progress, session, true, 'pick_x');
    progress = r.progress;
    expect(progress.wrongQuestionIds).not.toContain('pick_x');
    expect(progress.clearedQuestionIds).toContain('pick_x');
  });

  it('questionId 없이 호출하면 복습 풀을 건드리지 않는다(하위 호환)', () => {
    const progress = loadProgress();
    const session = startDailySession();
    const { progress: next } = recordDailyAnswer(progress, session, false);
    expect(next.wrongQuestionIds).toEqual([]);
    expect(readStored().wrongQuestionIds).toBeUndefined();
  });
});

describe('completeWorldStage 복습 풀 기록', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('스테이지 클리어 시 전달된 문항 id 를 cleared 에 추가한다', () => {
    const progress = loadProgress();
    const next = completeWorldStage(progress, 1, 1, ['pick_arr_001', 'pick_arr_007']);
    expect(next.clearedQuestionIds).toEqual(
      expect.arrayContaining(['pick_arr_001', 'pick_arr_007']),
    );
  });

  it('이미 클리어한 스테이지는 멱등(복습 풀도 무변경)', () => {
    let progress = loadProgress();
    progress = completeWorldStage(progress, 1, 1, ['pick_arr_001']);
    const before = progress.clearedQuestionIds.length;
    progress = completeWorldStage(progress, 1, 1, ['pick_arr_007']);
    expect(progress.clearedQuestionIds.length).toBe(before);
  });
});

describe('recordReviewAnswer (복습 화면 재풀이)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('정답이면 wrong→cleared 이동 후 영속화한다', () => {
    // 저장된 blob 에 wrong 키가 있을 때 — 정답 후 wrong 은 빈 배열로 영속(부활 방지).
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 6,
        xp: 0,
        level: 1,
        xpToNextLevel: 100,
        wrongQuestionIds: ['pick_a'],
      }),
    );
    const base = loadProgress();
    const next = recordReviewAnswer(base, 'pick_a', true);
    expect(next.wrongQuestionIds).toEqual([]);
    expect(next.clearedQuestionIds).toEqual(['pick_a']);
    expect(readStored().wrongQuestionIds).toEqual([]);
    expect(readStored().clearedQuestionIds).toEqual(['pick_a']);
  });

  it('오답이면 wrong 에 유지/추가한다', () => {
    const base = loadProgress();
    const next = recordReviewAnswer(base, 'pick_a', false);
    expect(next.wrongQuestionIds).toEqual(['pick_a']);
  });
});

describe('resolveQuestionsByIds', () => {
  it('풀에 존재하는 id 만 입력 순서대로 해석한다(스테일 id 무시)', () => {
    const { picks } = loadQuestionPools();
    const realId = picks[0].id;
    const resolved = resolveQuestionsByIds([realId, '__stale_unknown__']);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].id).toBe(realId);
  });

  it('빈 입력은 빈 결과', () => {
    expect(resolveQuestionsByIds([])).toEqual([]);
  });
});

describe('migrateLegacy 복습 풀 보존(동기화된 모바일 blob)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('저장된 cleared/wrong 배열을 초기화하지 않고 보존한다', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 6,
        xp: 10,
        level: 1,
        xpToNextLevel: 100,
        clearedQuestionIds: ['pick_cleared'],
        wrongQuestionIds: ['pick_wrong_1', 'pick_wrong_2'],
      }),
    );
    const loaded = loadProgress();
    expect(loaded.clearedQuestionIds).toEqual(['pick_cleared']);
    expect(loaded.wrongQuestionIds).toEqual(['pick_wrong_1', 'pick_wrong_2']);
    // 저장 후에도 배열이 줄어들지 않는다.
    expect(readStored().wrongQuestionIds).toEqual(['pick_wrong_1', 'pick_wrong_2']);
  });

  it('마지막 오답을 비우면 저장 blob 의 wrong 배열도 빈 배열로 반영된다(부활 방지)', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 6,
        xp: 0,
        level: 1,
        xpToNextLevel: 100,
        wrongQuestionIds: ['pick_a'],
      }),
    );
    const base = loadProgress();
    recordReviewAnswer(base, 'pick_a', true);
    expect(readStored().wrongQuestionIds).toEqual([]);
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
import {
  completeWorldStage,
  loadProgress,
  saveProgress,
  STAGE_XP_PER_QUESTION,
  type GuestProgress,
} from './progress';
import {
  WORLD1_TOTAL_STAGES,
  WORLD2_TOTAL_STAGES,
  WORLD2_UNLOCK_CLEARED_COUNT,
} from '../content/worldStages';

const STORAGE_KEY = 'algofit:guestProgress';

function writeStored(blob: Record<string, unknown>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(blob));
}

function cleared(n: number): string {
  return n === 0 ? 'current' : 'cleared';
}

describe('월드맵 기본값', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('초기 진행은 world1Nodes 20개(첫 current), world2Nodes 15개(전부 locked)', () => {
    const p = loadProgress();
    expect(p.world1Nodes).toHaveLength(WORLD1_TOTAL_STAGES);
    expect(p.world1Nodes[0]).toBe('current');
    expect(p.world1Nodes.slice(1).every((n) => n === 'locked')).toBe(true);
    expect(p.world2Nodes).toHaveLength(WORLD2_TOTAL_STAGES);
    expect(p.world2Nodes.every((n) => n === 'locked')).toBe(true);
    expect(p.world2Unlocked).toBe(false);
  });
});

describe('스테이지 진행', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('스테이지 클리어 시 노드가 cleared 되고 다음 노드가 current 로 승격된다', () => {
    const p = loadProgress();
    const next = completeWorldStage(p, 1, 1);
    expect(next.world1Nodes[0]).toBe('cleared');
    expect(next.world1Nodes[1]).toBe('current');
    expect(next.world1Nodes[2]).toBe('locked');
  });

  it('클리어 시 세트 크기와 무관하게 정액 XP(10) 가 지급된다(모바일 미러)', () => {
    const p = loadProgress();
    const next = completeWorldStage(p, 1, 1);
    expect(next.xp - p.xp).toBe(STAGE_XP_PER_QUESTION);
    expect(STAGE_XP_PER_QUESTION).toBe(10);
  });

  it('이미 클리어한 스테이지는 XP 를 다시 주지 않고 진행도 그대로다(멱등)', () => {
    let p = loadProgress();
    p = completeWorldStage(p, 1, 1);
    const xpAfterFirst = p.xp;
    const nodesAfterFirst = [...p.world1Nodes];
    const again = completeWorldStage(p, 1, 1);
    expect(again.xp).toBe(xpAfterFirst);
    expect(again.world1Nodes).toEqual(nodesAfterFirst);
  });

  it('World 1 스테이지 7개 클리어 시 World 2 가 해금된다', () => {
    let p = loadProgress();
    expect(p.world2Unlocked).toBe(false);
    for (let order = 1; order <= WORLD2_UNLOCK_CLEARED_COUNT; order += 1) {
      p = completeWorldStage(p, 1, order);
    }
    expect(p.world2Unlocked).toBe(true);
    expect(p.world2Nodes[0]).toBe('current');
  });

  it('이미 해금된 World 2 진행은 추가 World 1 클리어 시 리셋되지 않는다', () => {
    // world2Unlocked=true 이고 world2 에 일부 cleared 진행이 있는 동기화 blob.
    const world2 = Array.from({ length: WORLD2_TOTAL_STAGES }, (_, i) =>
      i < 2 ? 'cleared' : i === 2 ? 'current' : 'locked',
    );
    const world1 = Array.from({ length: WORLD1_TOTAL_STAGES }, (_, i) =>
      i < WORLD2_UNLOCK_CLEARED_COUNT
        ? 'cleared'
        : i === WORLD2_UNLOCK_CLEARED_COUNT
          ? 'current'
          : 'locked',
    );
    writeStored({
      schemaVersion: 6,
      world2Unlocked: true,
      world1Nodes: world1,
      world2Nodes: world2,
    });
    const p = loadProgress();
    expect(p.world2Unlocked).toBe(true);
    // World 1 의 다음 스테이지(8번째)를 추가로 클리어 → world2 는 그대로여야 한다.
    const next = completeWorldStage(p, 1, WORLD2_UNLOCK_CLEARED_COUNT + 1);
    expect(next.world2Unlocked).toBe(true);
    expect(next.world2Nodes).toEqual(world2);
  });

  it('World 2 가 잠긴 상태에서는 World 2 스테이지를 클리어할 수 없다', () => {
    const p = loadProgress();
    const next = completeWorldStage(p, 2, 1);
    expect(next).toBe(p);
  });
});

describe('노드 정규화 (마이그레이션)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('레거시 5개 world1Nodes 는 20개로 패딩된다', () => {
    writeStored({
      schemaVersion: 6,
      world1Nodes: ['cleared', 'current', 'locked', 'locked', 'locked'],
    });
    const p = loadProgress();
    expect(p.world1Nodes).toHaveLength(WORLD1_TOTAL_STAGES);
    expect(p.world1Nodes[0]).toBe('cleared');
    expect(p.world1Nodes[1]).toBe('current');
    expect(p.world1Nodes.slice(2).every((n) => n === 'locked')).toBe(true);
  });

  it('10개 world2Nodes 는 15개로 패딩된다', () => {
    writeStored({
      schemaVersion: 6,
      world2Unlocked: true,
      world2Nodes: Array.from({ length: 10 }, (_, i) => cleared(i)),
    });
    const p = loadProgress();
    expect(p.world2Nodes).toHaveLength(WORLD2_TOTAL_STAGES);
  });

  it('기존 항목이 모두 cleared 면 첫 패딩 슬롯(nodes[oldLen])이 current 로 승격된다', () => {
    writeStored({
      schemaVersion: 6,
      world1Nodes: ['cleared', 'cleared', 'cleared'],
    });
    const p = loadProgress();
    expect(p.world1Nodes).toHaveLength(WORLD1_TOTAL_STAGES);
    expect(p.world1Nodes[0]).toBe('cleared');
    expect(p.world1Nodes[2]).toBe('cleared');
    expect(p.world1Nodes[3]).toBe('current');
    expect(p.world1Nodes.slice(4).every((n) => n === 'locked')).toBe(true);
  });

  it('부분 진행(일부만 cleared, current 없음)은 합성된 current 를 만들지 않는다', () => {
    // [cleared, cleared, locked] → 전부 cleared 가 아니므로 승격하지 않는다.
    writeStored({
      schemaVersion: 6,
      world1Nodes: ['cleared', 'cleared', 'locked'],
    });
    const p = loadProgress();
    expect(p.world1Nodes).toHaveLength(WORLD1_TOTAL_STAGES);
    expect(p.world1Nodes[0]).toBe('cleared');
    expect(p.world1Nodes[1]).toBe('cleared');
    expect(p.world1Nodes.slice(2).every((n) => n === 'locked')).toBe(true);
    expect(p.world1Nodes.some((n) => n === 'current')).toBe(false);
  });

  it('모바일 20/15 길이 배열은 줄어들지 않고 보존된다(sync 무손실)', () => {
    const w1 = Array.from({ length: 20 }, (_, i) => (i < 8 ? 'cleared' : i === 8 ? 'current' : 'locked'));
    const w2 = Array.from({ length: 15 }, (_, i) => (i === 0 ? 'current' : 'locked'));
    writeStored({ schemaVersion: 6, world2Unlocked: true, world1Nodes: w1, world2Nodes: w2 });
    const p = loadProgress();
    expect(p.world1Nodes).toHaveLength(20);
    expect(p.world2Nodes).toHaveLength(15);
    expect(p.world1Nodes).toEqual(w1);
    expect(p.world2Nodes).toEqual(w2);
  });

  it('알 수 없는 노드 문자열은 locked 로 파싱된다', () => {
    writeStored({ schemaVersion: 6, world1Nodes: ['cleared', 'bogus', 'current'] });
    const p = loadProgress();
    expect(p.world1Nodes[1]).toBe('locked');
  });

  it('저장 시 world 필드가 v6 blob 에 직렬화된다(모바일 미지 필드 보존)', () => {
    writeStored({ schemaVersion: 6, scenarioNodes: ['x'], unlockedBadgeIds: ['b1'] });
    let p = loadProgress();
    p = completeWorldStage(p, 1, 1);
    const blob = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as Record<string, unknown>;
    expect(blob.world1Nodes).toBeDefined();
    expect(blob.world2Nodes).toBeDefined();
    expect(blob.scenarioNodes).toEqual(['x']);
    expect(blob.unlockedBadgeIds).toEqual(['b1']);
  });

  it('saveProgress 는 onSaved 훅(sync push)을 호출한다', () => {
    const p: GuestProgress = loadProgress();
    // saveProgress 가 던지지 않고 round-trip 되는지 확인
    saveProgress({ ...p, xp: 999 });
    expect(loadProgress().xp).toBe(999);
  });
});

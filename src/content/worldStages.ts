// 학습 월드맵 데이터 — apps/mobile/lib/data/world1_stages.dart / world2_stages.dart 포팅.
// World 1 = 20 스테이지, World 2 = 15 스테이지.

export type WorldStage = {
  id: string;
  order: number;
  title: string;
  tags: string[];
};

export type WorldDefinition = {
  id: number;
  title: string;
  subtitle: string;
  totalStages: number;
  stages: WorldStage[];
  /** null 이면 항상 해금. 값이 있으면 World 1 클리어 수로 해금. */
  unlockAfterWorld1Cleared: number | null;
};

/** World 2 해금: World 1 스테이지 클리어 개수 */
export const WORLD2_UNLOCK_CLEARED_COUNT = 7;

export const WORLD1_TOTAL_STAGES = 20;
export const WORLD2_TOTAL_STAGES = 15;

export const world1Stages: WorldStage[] = [
  { id: 'stage_w1_01', order: 1, title: '배열이 뭐죠?', tags: ['array'] },
  { id: 'stage_w1_02', order: 2, title: '합구하기 입문', tags: ['array'] },
  { id: 'stage_w1_03', order: 3, title: '최댓값 찾기', tags: ['array'] },
  { id: 'stage_w1_04', order: 4, title: '두 수의 합', tags: ['array'] },
  { id: 'stage_w1_05', order: 5, title: '투 포인터 입문', tags: ['two_pointer'] },
  { id: 'stage_w1_06', order: 6, title: '투 포인터 코드', tags: ['two_pointer'] },
  { id: 'stage_w1_07', order: 7, title: '부분 배열 합', tags: ['two_pointer'] },
  { id: 'stage_w1_08', order: 8, title: '투 포인터 복습', tags: ['two_pointer'] },
  { id: 'stage_w1_09', order: 9, title: '해시가 필요해요', tags: ['hash'] },
  { id: 'stage_w1_10', order: 10, title: '두 수의 합 (해시)', tags: ['hash'] },
  { id: 'stage_w1_11', order: 11, title: '빈도 세기', tags: ['hash'] },
  { id: 'stage_w1_12', order: 12, title: '해시 복습', tags: ['hash'] },
  { id: 'stage_w1_13', order: 13, title: '이분 탐색이란', tags: ['binary_search'] },
  { id: 'stage_w1_14', order: 14, title: '이분 탐색 코드', tags: ['binary_search'] },
  { id: 'stage_w1_15', order: 15, title: 'lower bound 맛보기', tags: ['binary_search'] },
  { id: 'stage_w1_16', order: 16, title: '배열 + 이분 조합', tags: ['binary_search', 'array'] },
  {
    id: 'stage_w1_17',
    order: 17,
    title: 'World 1 중간 보스',
    tags: ['array', 'two_pointer', 'hash'],
  },
  { id: 'stage_w1_18', order: 18, title: '약한 패턴 보충', tags: ['hash'] },
  { id: 'stage_w1_19', order: 19, title: '속도 훈련', tags: ['two_pointer'] },
  { id: 'stage_w1_20', order: 20, title: 'World 1 클리어', tags: ['array', 'binary_search'] },
];

export const world2Stages: WorldStage[] = [
  { id: 'stage_w2_01', order: 1, title: '스택이 뭐죠?', tags: ['stack'] },
  { id: 'stage_w2_02', order: 2, title: '괄호 검사', tags: ['stack'] },
  { id: 'stage_w2_03', order: 3, title: '스택 코드', tags: ['stack'] },
  { id: 'stage_w2_04', order: 4, title: 'BFS 입문', tags: ['bfs'] },
  { id: 'stage_w2_05', order: 5, title: '격자 최단거리', tags: ['bfs'] },
  { id: 'stage_w2_06', order: 6, title: '스택 연습', tags: ['stack'] },
  { id: 'stage_w2_07', order: 7, title: '괄호 심화', tags: ['stack'] },
  { id: 'stage_w2_08', order: 8, title: '큐와 BFS', tags: ['bfs'] },
  { id: 'stage_w2_09', order: 9, title: 'BFS 연습', tags: ['bfs'] },
  { id: 'stage_w2_10', order: 10, title: '최단 경로 마스터', tags: ['bfs'] },
  { id: 'stage_w2_11', order: 11, title: '스택 복습', tags: ['stack'] },
  { id: 'stage_w2_12', order: 12, title: '스택 심화', tags: ['stack'] },
  { id: 'stage_w2_13', order: 13, title: 'BFS 거리', tags: ['bfs'] },
  { id: 'stage_w2_14', order: 14, title: '위상 정렬', tags: ['bfs'] },
  { id: 'stage_w2_15', order: 15, title: '종합 도전', tags: ['stack', 'bfs'] },
];

const worldCatalog: Record<number, WorldDefinition> = {
  1: {
    id: 1,
    title: 'World 1',
    subtitle: '배열 · 투 포인터 · 해시 · 이분 탐색',
    totalStages: WORLD1_TOTAL_STAGES,
    stages: world1Stages,
    unlockAfterWorld1Cleared: null,
  },
  2: {
    id: 2,
    title: 'World 2',
    subtitle: '스택 · BFS',
    totalStages: WORLD2_TOTAL_STAGES,
    stages: world2Stages,
    unlockAfterWorld1Cleared: WORLD2_UNLOCK_CLEARED_COUNT,
  },
};

export const supportedWorldIds: number[] = Object.keys(worldCatalog).map(Number);

export function worldById(worldId: number): WorldDefinition | undefined {
  return worldCatalog[worldId];
}

export function isWorldSupported(worldId: number): boolean {
  return worldId in worldCatalog;
}

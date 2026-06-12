import {
  effectiveCodeLanguage,
  loadPreferredCodeLanguage,
  normalizeCodeLanguage,
} from './codeLanguage';
import { DAILY_TOTAL } from './daily';
import { PC_BONUS_XP } from './pcBonus';
import {
  WORLD1_TOTAL_STAGES,
  WORLD2_TOTAL_STAGES,
  WORLD2_UNLOCK_CLEARED_COUNT,
  worldById,
} from '../content/worldStages';

const STORAGE_KEY = 'algofit:guestProgress';
export { effectiveCodeLanguage, loadPreferredCodeLanguage };
const GUEST_ID_KEY = 'algofit:guestId';
const DAILY_SESSION_KEY = 'algofit:dailySession';

export type GuestProgress = {
  schemaVersion: number;
  guestId: string;
  preferredCodeLanguage?: string | null;
  level: number;
  xp: number;
  xpToNextLevel: number;
  streakCount: number;
  lastDailyDate: string | null;
  todayDailyCompleted: boolean;
  todayAllCorrect: boolean;
  dailyProgress: number;
  dailyTotal: number;
  dailyPickCount: number;
  dailyBlankCount: number;
  hearts: number;
  world1Nodes: WorldNodeState[];
  world2Nodes: WorldNodeState[];
  world2Unlocked: boolean;
  /** PC 보너스(긴 빈칸) 오늘 완료 여부 — 스트릭과 무관 */
  todayPcBonusCompleted?: boolean;
  lastPcBonusDate?: string | null;
};

export type WorldNodeState = 'locked' | 'current' | 'cleared';

/** World 1 기본 노드(20개) — 첫 번째 current, 나머지 locked. */
function defaultWorld1Nodes(): WorldNodeState[] {
  return makeDefaultNodes(WORLD1_TOTAL_STAGES, true);
}

/** World 2 기본 노드(15개) — 해금이면 첫 current, 아니면 전부 locked. */
function defaultWorld2Nodes(unlocked: boolean): WorldNodeState[] {
  return makeDefaultNodes(WORLD2_TOTAL_STAGES, unlocked);
}

function makeDefaultNodes(count: number, firstCurrent: boolean): WorldNodeState[] {
  return Array.from({ length: count }, (_, i) =>
    i === 0 && firstCurrent ? 'current' : 'locked',
  );
}

export type DailySession = {
  questionIndex: number;
  answers: boolean[];
  hearts: number;
  xpEarned: number;
  awaitingFeedback: boolean;
  lastAnswerCorrect: boolean | null;
  startedAt: string;
};

// 모바일과 동기화 호환을 위해 v6 로 저장한다(모바일은 schemaVersion>=6 만 채택).
const SCHEMA_VERSION = 6;

const DEFAULT_PROGRESS: Omit<GuestProgress, 'guestId'> = {
  schemaVersion: SCHEMA_VERSION,
  preferredCodeLanguage: loadPreferredCodeLanguage(),
  level: 1,
  xp: 0,
  xpToNextLevel: 100,
  streakCount: 0,
  lastDailyDate: null,
  todayDailyCompleted: false,
  todayAllCorrect: false,
  dailyProgress: 0,
  dailyTotal: DAILY_TOTAL,
  dailyPickCount: 3,
  dailyBlankCount: 2,
  hearts: 5,
  world1Nodes: defaultWorld1Nodes(),
  world2Nodes: defaultWorld2Nodes(false),
  world2Unlocked: false,
  todayPcBonusCompleted: false,
  lastPcBonusDate: null,
};

const WORLD_NODE_STATES: readonly WorldNodeState[] = ['locked', 'current', 'cleared'];

function parseWorldNode(raw: unknown): WorldNodeState {
  return WORLD_NODE_STATES.includes(raw as WorldNodeState)
    ? (raw as WorldNodeState)
    : 'locked';
}

/**
 * 저장된 노드 배열을 스테이지 수에 맞춰 정규화한다(모바일 _normalizeWorld2Nodes 미러).
 * - 짧으면 'locked' 로 패딩, 길면 잘라낸다.
 * - 미지 문자열은 'locked' 로.
 * - 승격 규칙(모바일 동일): 저장 길이 oldLen 이 0 < oldLen < stageCount 이고
 *   기존 항목이 *전부* cleared 인 경우에만, 첫 패딩 슬롯 nodes[oldLen] 을 current 로 승격한다.
 *   부분 진행(일부 cleared, current 없음)은 합성된 current 를 만들지 않는다.
 */
function normalizeWorldNodes(
  raw: unknown,
  stageCount: number,
  fallback: WorldNodeState[],
): WorldNodeState[] {
  if (!Array.isArray(raw)) return [...fallback];
  const parsed = raw.map(parseWorldNode);

  // 더 긴 배열은 잘라내고 반환(트림). 패딩 후 승격 로직은 적용하지 않는다.
  if (parsed.length >= stageCount) return parsed.slice(0, stageCount);

  const oldLen = parsed.length;
  const allOldCleared = oldLen > 0 && parsed.every((n) => n === 'cleared');

  const nodes = [...parsed];
  while (nodes.length < stageCount) nodes.push('locked');

  // 기존 항목이 전부 cleared 일 때만 첫 패딩 슬롯을 current 로 승격.
  if (allOldCleared && oldLen < stageCount) {
    nodes[oldLen] = 'current';
  }
  return nodes;
}

function clearedCount(nodes: WorldNodeState[]): number {
  return nodes.filter((n) => n === 'cleared').length;
}

function createGuestId(): string {
  return crypto.randomUUID();
}

/** Asia/Seoul calendar date YYYY-MM-DD */
export function getTodaySeoul(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function ensureGuestId(): string {
  let id = localStorage.getItem(GUEST_ID_KEY);
  if (!id) {
    id = createGuestId();
    localStorage.setItem(GUEST_ID_KEY, id);
  }
  return id;
}

function migrateLegacy(parsed: Record<string, unknown>): GuestProgress {
  const guestId = ensureGuestId();
  const streak =
    typeof parsed.streakCount === 'number'
      ? parsed.streakCount
      : typeof parsed.streak === 'number'
        ? parsed.streak
        : DEFAULT_PROGRESS.streakCount;

  const storedLang =
    typeof parsed.preferredCodeLanguage === 'string'
      ? parsed.preferredCodeLanguage
      : loadPreferredCodeLanguage();

  // 저장된 노드 배열(모바일 20/15, 레거시 웹 5)을 보존하되 스테이지 수로 정규화한다.
  const world1Nodes = normalizeWorldNodes(
    parsed.world1Nodes,
    WORLD1_TOTAL_STAGES,
    defaultWorld1Nodes(),
  );
  const world2Unlocked =
    typeof parsed.world2Unlocked === 'boolean'
      ? parsed.world2Unlocked
      : clearedCount(world1Nodes) >= WORLD2_UNLOCK_CLEARED_COUNT;
  const world2Nodes = normalizeWorldNodes(
    parsed.world2Nodes,
    WORLD2_TOTAL_STAGES,
    defaultWorld2Nodes(world2Unlocked),
  );

  return {
    ...DEFAULT_PROGRESS,
    guestId,
    schemaVersion: SCHEMA_VERSION,
    preferredCodeLanguage: storedLang,
    level: typeof parsed.level === 'number' ? parsed.level : DEFAULT_PROGRESS.level,
    xp: typeof parsed.xp === 'number' ? parsed.xp : DEFAULT_PROGRESS.xp,
    xpToNextLevel:
      typeof parsed.xpToNextLevel === 'number'
        ? parsed.xpToNextLevel
        : DEFAULT_PROGRESS.xpToNextLevel,
    streakCount: streak,
    lastDailyDate:
      typeof parsed.lastDailyDate === 'string' ? parsed.lastDailyDate : null,
    todayDailyCompleted: Boolean(parsed.todayDailyCompleted),
    todayAllCorrect: Boolean(parsed.todayAllCorrect),
    dailyProgress:
      typeof parsed.dailyProgress === 'number' ? parsed.dailyProgress : 0,
    // 저장된 blob(모바일 등)의 daily 설정 값은 보존한다 — 매 저장마다 웹 상수로
    // 덮어쓰면 다른 클라이언트의 dailyTotal/pick/blank 가 손상되기 때문.
    dailyTotal: typeof parsed.dailyTotal === 'number' ? parsed.dailyTotal : DAILY_TOTAL,
    dailyPickCount:
      typeof parsed.dailyPickCount === 'number'
        ? parsed.dailyPickCount
        : DEFAULT_PROGRESS.dailyPickCount,
    dailyBlankCount:
      typeof parsed.dailyBlankCount === 'number'
        ? parsed.dailyBlankCount
        : DEFAULT_PROGRESS.dailyBlankCount,
    hearts: typeof parsed.hearts === 'number' ? parsed.hearts : 5,
    world1Nodes,
    world2Nodes,
    world2Unlocked,
    todayPcBonusCompleted: Boolean(parsed.todayPcBonusCompleted),
    lastPcBonusDate:
      typeof parsed.lastPcBonusDate === 'string' ? parsed.lastPcBonusDate : null,
  };
}

function resetDailyIfNewDay(progress: GuestProgress, today: string): GuestProgress {
  if (!progress.lastDailyDate || progress.lastDailyDate === today) {
    return progress;
  }
  return {
    ...progress,
    todayDailyCompleted: false,
    todayAllCorrect: false,
    dailyProgress: 0,
    hearts: 5,
    todayPcBonusCompleted: false,
    lastPcBonusDate: null,
  };
}

export function loadProgress(): GuestProgress {
  const guestId = ensureGuestId();
  const today = getTodaySeoul();
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    const initial: GuestProgress = { ...DEFAULT_PROGRESS, guestId };
    saveProgress(initial);
    return initial;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    let progress = migrateLegacy(parsed);
    progress = resetDailyIfNewDay(progress, today);
    progress.guestId = guestId;
    return progress;
  } catch {
    const initial: GuestProgress = { ...DEFAULT_PROGRESS, guestId };
    saveProgress(initial);
    return initial;
  }
}

/** STORAGE_KEY 의 원본 blob(웹이 모르는 필드 포함)을 그대로 읽는다. 없으면 {}. */
export function loadRawProgress(): Record<string, unknown> {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/** 저장 후 호출되는 훅(동기화 push 트리거 등). progress→sync 순환 import 방지용. */
let onSaved: (() => void) | null = null;
export function setOnSaved(cb: (() => void) | null): void {
  onSaved = cb;
}

export function saveProgress(progress: GuestProgress): void {
  // 웹이 모르는 필드(모바일 v6: world2Nodes/scenario/badges/cleared·wrong ids 등)는
  // 보존하고 웹이 관리하는 필드만 덮어쓴다 → 같은 guestId 의 모바일 진행을 손상시키지 않는다.
  const merged = {
    ...loadRawProgress(),
    ...progress,
    schemaVersion: SCHEMA_VERSION,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  if (progress.preferredCodeLanguage) {
    localStorage.setItem(
      'algofit:preferredCodeLanguage',
      progress.preferredCodeLanguage,
    );
  }
  onSaved?.();
}

/** 서버에서 받은 blob 을 로컬에 채택한다(미지 필드까지 통째로 보존). guestId 는 기기 값 유지. */
export function adoptServerProgress(data: Record<string, unknown>): void {
  const guestId = ensureGuestId();
  const next = JSON.stringify({ ...data, guestId });
  const prev = localStorage.getItem(STORAGE_KEY);
  localStorage.setItem(STORAGE_KEY, next);
  // 이미 마운트된 화면들이 stale 한 로컬 값을 표시하지 않도록 전역 신호를 보낸다.
  // (adopt 는 saveProgress 를 우회해 React state 를 갱신하지 않으므로 명시적 통지가 필요)
  // 단, 저장된 blob 이 실제로 바뀐 경우에만 신호를 보낸다 — 동일 데이터를 다시
  // 채택할 때 신호를 보내면 (App 의 key 리마운트 → Continue 재pull → adopt) 핸드오프
  // 무한 루프가 발생한다. 첫 채택에서 blob 이 달라 신호 → 리마운트 → 같은 데이터 재채택
  // 시 next === prev → 신호 없음 → 한 사이클 후 루프 종료.
  if (next !== prev && typeof window !== 'undefined') {
    window.dispatchEvent(new Event('algofit:progress-adopted'));
  }
}

export function setPreferredCodeLanguage(languageId: string): GuestProgress {
  const progress = loadProgress();
  const normalized = normalizeCodeLanguage(languageId);
  const next: GuestProgress = {
    ...progress,
    preferredCodeLanguage: normalized,
  };
  saveProgress(next);
  return next;
}

export function progressEffectiveCodeLanguage(progress: GuestProgress): string {
  return normalizeCodeLanguage(
    progress.preferredCodeLanguage ?? loadPreferredCodeLanguage(),
  );
}

export function loadDailySession(): DailySession | null {
  const raw = sessionStorage.getItem(DAILY_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DailySession;
  } catch {
    return null;
  }
}

export function saveDailySession(session: DailySession | null): void {
  if (!session) {
    sessionStorage.removeItem(DAILY_SESSION_KEY);
    return;
  }
  sessionStorage.setItem(DAILY_SESSION_KEY, JSON.stringify(session));
}

export function startDailySession(): DailySession {
  const session: DailySession = {
    questionIndex: 0,
    answers: [],
    hearts: 5,
    xpEarned: 0,
    awaitingFeedback: false,
    lastAnswerCorrect: null,
    startedAt: new Date().toISOString(),
  };
  saveDailySession(session);
  return session;
}

export function addXp(progress: GuestProgress, amount: number): GuestProgress {
  let xp = progress.xp + amount;
  let level = progress.level;
  let xpToNextLevel = progress.xpToNextLevel;

  while (xp >= xpToNextLevel) {
    xp -= xpToNextLevel;
    level += 1;
    xpToNextLevel = Math.round(xpToNextLevel * 1.25);
  }

  return { ...progress, xp, level, xpToNextLevel };
}

export function recordDailyAnswer(
  progress: GuestProgress,
  session: DailySession,
  isCorrect: boolean,
): { progress: GuestProgress; session: DailySession } {
  const xpGain = 10;
  const nextSession: DailySession = {
    ...session,
    answers: [...session.answers, isCorrect],
    xpEarned: session.xpEarned + xpGain,
    awaitingFeedback: true,
    lastAnswerCorrect: isCorrect,
  };

  let nextProgress = addXp(progress, xpGain);
  nextProgress = {
    ...nextProgress,
    dailyProgress: nextSession.answers.length,
  };

  saveDailySession(nextSession);
  saveProgress(nextProgress);
  return { progress: nextProgress, session: nextSession };
}

export function advanceAfterFeedback(
  session: DailySession,
): DailySession {
  const next: DailySession = {
    ...session,
    questionIndex: session.questionIndex + 1,
    awaitingFeedback: false,
    lastAnswerCorrect: null,
  };
  saveDailySession(next);
  return next;
}

export const DAILY_PERFECT_BONUS_XP = 20;

export function completeDailyChallenge(
  progress: GuestProgress,
  session: DailySession,
): GuestProgress {
  const today = getTodaySeoul();
  const completed = session.answers.length === DAILY_TOTAL;
  const allCorrect = completed && session.answers.every(Boolean);

  let next: GuestProgress = {
    ...progress,
    todayDailyCompleted: true,
    todayAllCorrect: allCorrect,
    dailyProgress: DAILY_TOTAL,
    lastDailyDate: today,
  };

  const alreadyCountedToday =
    progress.lastDailyDate === today && progress.todayDailyCompleted;

  if (completed && !alreadyCountedToday) {
    next = { ...next, streakCount: progress.streakCount + 1 };
    if (allCorrect) {
      next = addXp(next, DAILY_PERFECT_BONUS_XP);
    }
  }

  saveProgress(next);
  saveDailySession(null);
  return next;
}

/**
 * 스테이지 클리어 1회당 정액 XP — 모바일 stageXpPerQuestion(=10) 과 동일.
 * 모바일 completeStage 는 세트 크기와 무관하게 클리어당 10 XP 를 정액 지급한다.
 */
export const STAGE_XP_PER_QUESTION = 10;

export function nodesForWorld(progress: GuestProgress, worldId: number): WorldNodeState[] {
  if (worldId === 1) return progress.world1Nodes;
  if (worldId === 2) return progress.world2Nodes;
  return [];
}

export function isWorldPlayable(progress: GuestProgress, worldId: number): boolean {
  const def = worldById(worldId);
  if (!def) return false;
  if (def.unlockAfterWorld1Cleared == null) return true;
  return progress.world2Unlocked;
}

/** 스테이지 클리어 후 맵 노드 갱신 (order 는 1-based). 모바일 advanceWorldNodesAfterClear 미러. */
function advanceNodesAfterClear(
  nodes: WorldNodeState[],
  clearedStageOrder: number,
  stageCount: number,
): WorldNodeState[] {
  const result = [...nodes];
  while (result.length < stageCount) result.push('locked');

  const idx = clearedStageOrder - 1;
  if (idx < 0 || idx >= result.length) return result;

  result[idx] = 'cleared';
  const nextIdx = idx + 1;
  if (nextIdx < result.length && result[nextIdx] === 'locked') {
    result[nextIdx] = 'current';
  }
  return result;
}

/**
 * 스테이지 클리어를 진행에 반영한다(모바일 WorldProgressService.completeStage 미러).
 * - 노드를 cleared 로, 다음 노드를 current 로 승격.
 * - World 1 클리어 수 >= 7 이면 World 2 해금.
 * - XP 지급: 클리어당 정액 STAGE_XP_PER_QUESTION(=10). 세트 크기와 무관(모바일 미러).
 *   이미 클리어한 스테이지는 XP 0 + 노드 무변경(멱등 — 모바일 alreadyCleared).
 * - saveProgress 호출 → sync push 트리거.
 */
export function completeWorldStage(
  progress: GuestProgress,
  worldId: number,
  stageOrder: number,
): GuestProgress {
  const def = worldById(worldId);
  if (!def) return progress;
  if (!isWorldPlayable(progress, worldId)) return progress;

  const stageCount = def.stages.length;
  const nodes = nodesForWorld(progress, worldId);
  const idx = stageOrder - 1;
  const alreadyCleared = idx >= 0 && idx < nodes.length && nodes[idx] === 'cleared';

  // 이미 클리어된 스테이지는 멱등: XP·노드 모두 그대로 두고 진행을 변경하지 않는다.
  if (alreadyCleared) return progress;

  const updatedNodes = advanceNodesAfterClear(nodes, stageOrder, stageCount);

  let next: GuestProgress = addXp(progress, STAGE_XP_PER_QUESTION);

  next =
    worldId === 1
      ? { ...next, world1Nodes: updatedNodes }
      : { ...next, world2Nodes: updatedNodes };

  if (worldId === 1) {
    const threshold = worldById(2)?.unlockAfterWorld1Cleared;
    if (
      threshold != null &&
      clearedCount(updatedNodes) >= threshold &&
      !next.world2Unlocked
    ) {
      next = {
        ...next,
        world2Unlocked: true,
        world2Nodes: defaultWorld2Nodes(true),
      };
    }
  }

  saveProgress(next);
  return next;
}

export function completePcBonus(progress: GuestProgress): GuestProgress {
  const today = getTodaySeoul();
  if (progress.todayPcBonusCompleted && progress.lastPcBonusDate === today) {
    return progress;
  }

  let next = addXp(progress, PC_BONUS_XP);
  next = {
    ...next,
    todayPcBonusCompleted: true,
    lastPcBonusDate: today,
  };
  saveProgress(next);
  return next;
}

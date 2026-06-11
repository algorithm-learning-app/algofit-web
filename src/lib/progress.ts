import {
  effectiveCodeLanguage,
  loadPreferredCodeLanguage,
  normalizeCodeLanguage,
} from './codeLanguage';
import { DAILY_TOTAL } from './daily';
import { PC_BONUS_XP } from './pcBonus';

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
  world1Nodes: Array<'locked' | 'current' | 'cleared'>;
  /** PC 보너스(긴 빈칸) 오늘 완료 여부 — 스트릭과 무관 */
  todayPcBonusCompleted?: boolean;
  lastPcBonusDate?: string | null;
};

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
  world1Nodes: ['cleared', 'current', 'locked', 'locked', 'locked'],
  todayPcBonusCompleted: false,
  lastPcBonusDate: null,
};

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
    dailyTotal: DAILY_TOTAL,
    dailyPickCount: DEFAULT_PROGRESS.dailyPickCount,
    dailyBlankCount: DEFAULT_PROGRESS.dailyBlankCount,
    hearts: typeof parsed.hearts === 'number' ? parsed.hearts : 5,
    world1Nodes: Array.isArray(parsed.world1Nodes)
      ? (parsed.world1Nodes as GuestProgress['world1Nodes'])
      : DEFAULT_PROGRESS.world1Nodes,
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
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...data, guestId }),
  );
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

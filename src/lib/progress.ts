import { DAILY_TOTAL } from './daily';
import { PC_BONUS_XP } from './pcBonus';

const STORAGE_KEY = 'algofit:guestProgress';
const GUEST_ID_KEY = 'algofit:guestId';
const DAILY_SESSION_KEY = 'algofit:dailySession';

export type GuestProgress = {
  schemaVersion: 2;
  guestId: string;
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

const DEFAULT_PROGRESS: Omit<GuestProgress, 'guestId'> = {
  schemaVersion: 2,
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

  return {
    ...DEFAULT_PROGRESS,
    guestId,
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

export function saveProgress(progress: GuestProgress): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
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

export function completeDailyChallenge(
  progress: GuestProgress,
  session: DailySession,
): GuestProgress {
  const today = getTodaySeoul();
  const allCorrect =
    session.answers.length === DAILY_TOTAL &&
    session.answers.every(Boolean);

  let next: GuestProgress = {
    ...progress,
    todayDailyCompleted: true,
    todayAllCorrect: allCorrect,
    dailyProgress: DAILY_TOTAL,
    lastDailyDate: today,
  };

  const alreadyStreakedToday =
    progress.lastDailyDate === today && progress.todayAllCorrect;

  if (allCorrect && !alreadyStreakedToday) {
    next = { ...next, streakCount: progress.streakCount + 1 };
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

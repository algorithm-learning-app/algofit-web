import {
  adoptServerProgress,
  ensureGuestId,
  loadRawProgress,
  setOnSaved,
} from './progress';
import { SYNC_BASE_URL, SYNC_SECRET, syncToken } from './syncConfig';

const UPDATED_AT_KEY = 'algofit:sync:updatedAt';
const DEBOUNCE_MS = 1500;

export interface PulledProgress {
  updatedAt: number;
  data: Record<string, unknown>;
}

export interface SyncDeps {
  baseUrl?: string;
  secret?: string;
  fetchFn?: typeof fetch;
  nowMs?: () => number;
}

function getLocalUpdatedAt(): number {
  return Number(localStorage.getItem(UPDATED_AT_KEY) ?? '0') || 0;
}
function setLocalUpdatedAt(ms: number): void {
  localStorage.setItem(UPDATED_AT_KEY, String(ms));
}

function uri(baseUrl: string, guestId: string): string {
  return `${baseUrl}/v1/progress/${encodeURIComponent(guestId)}`;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

export async function pullProgress(
  guestId: string,
  deps: SyncDeps = {},
): Promise<PulledProgress | null> {
  const baseUrl = deps.baseUrl ?? SYNC_BASE_URL;
  const secret = deps.secret ?? SYNC_SECRET;
  const fetchFn = deps.fetchFn ?? fetch;
  if (!baseUrl || !secret || !guestId) return null;
  try {
    const token = await syncToken(guestId, secret);
    const res = await fetchFn(uri(baseUrl, guestId), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status !== 200) return null;
    const body: unknown = await res.json();
    if (!isPlainObject(body)) return null;
    const updatedAt = Number(body.updatedAt);
    const data = body.data;
    if (!Number.isFinite(updatedAt) || !isPlainObject(data)) return null;
    return { updatedAt, data };
  } catch {
    return null;
  }
}

export async function pushProgress(
  guestId: string,
  updatedAt: number,
  data: Record<string, unknown>,
  deps: SyncDeps = {},
): Promise<{ ok: boolean; conflict?: PulledProgress }> {
  const baseUrl = deps.baseUrl ?? SYNC_BASE_URL;
  const secret = deps.secret ?? SYNC_SECRET;
  const fetchFn = deps.fetchFn ?? fetch;
  if (!baseUrl || !secret || !guestId) return { ok: false };
  try {
    const token = await syncToken(guestId, secret);
    const res = await fetchFn(uri(baseUrl, guestId), {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ updatedAt, data }),
    });
    if (res.status === 200) return { ok: true };
    if (res.status === 409) {
      try {
        const body: unknown = await res.json();
        const current = isPlainObject(body) ? body.current : null;
        if (isPlainObject(current)) {
          const cUpdatedAt = Number(current.updatedAt);
          const cData = current.data;
          if (Number.isFinite(cUpdatedAt) && isPlainObject(cData)) {
            return { ok: false, conflict: { updatedAt: cUpdatedAt, data: cData } };
          }
        }
      } catch {
        // 409 본문 파싱 실패는 무시(다음 동기화에서 재시도).
      }
    }
    return { ok: false };
  } catch {
    return { ok: false };
  }
}

// adopt 는 saveProgress 를 거치지 않고 localStorage 에 직접 쓰므로 onSaved(=push) 를
// 트리거하지 않는다 → 채택이 push 루프를 만들지 않는다. suppress 는 방어적 안전장치.
let suppress = false;
let scheduled: ReturnType<typeof setTimeout> | null = null;

/**
 * 서버에서 받은 진행을 로컬에 채택하고 `algofit:sync:updatedAt` 를 서버 값으로 스탬프한다.
 * handoff 경로(Continue.tsx)처럼 sync 모듈 밖에서 채택할 때도 이걸 써야 다음 저장이
 * now() 로 새 타임스탬프를 찍어 서버를 덮어쓰는 일이 없다.
 */
export function applyPulled(pulled: PulledProgress): void {
  suppress = true;
  try {
    adoptServerProgress(pulled.data);
    setLocalUpdatedAt(pulled.updatedAt);
  } finally {
    suppress = false;
  }
}

function adopt(pulled: PulledProgress): void {
  applyPulled(pulled);
}

async function doPush(deps: SyncDeps, now: () => number): Promise<void> {
  const guestId = ensureGuestId();
  let updatedAt = getLocalUpdatedAt();
  if (updatedAt <= 0) {
    updatedAt = now();
    setLocalUpdatedAt(updatedAt);
  }
  const res = await pushProgress(guestId, updatedAt, loadRawProgress(), deps);
  if (!res.ok && res.conflict) adopt(res.conflict);
}

function schedulePush(deps: SyncDeps, now: () => number): void {
  if (scheduled) clearTimeout(scheduled);
  scheduled = setTimeout(() => {
    scheduled = null;
    void doPush(deps, now);
  }, DEBOUNCE_MS);
}

/**
 * 앱 시작 시 1회. 서버가 더 최신이면 로컬을 채택, 아니면 로컬을 올린다.
 * 이후 저장(onSaved)마다 디바운스 push 를 건다. 미설정/오류는 조용히 무시.
 */
export async function syncStartup(deps: SyncDeps = {}): Promise<void> {
  const baseUrl = deps.baseUrl ?? SYNC_BASE_URL;
  const secret = deps.secret ?? SYNC_SECRET;
  if (!baseUrl || !secret) return;
  const now = deps.nowMs ?? (() => Date.now());

  const guestId = ensureGuestId();
  const pulled = await pullProgress(guestId, deps);
  if (pulled && pulled.updatedAt > getLocalUpdatedAt()) {
    adopt(pulled);
  } else {
    await doPush(deps, now);
  }

  setOnSaved(() => {
    if (suppress) return;
    setLocalUpdatedAt(now());
    schedulePush(deps, now);
  });
}

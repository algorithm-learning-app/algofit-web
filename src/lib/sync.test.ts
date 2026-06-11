import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  pullProgress,
  pushProgress,
  syncStartup,
  type SyncDeps,
} from './sync';
import {
  ensureGuestId,
  loadRawProgress,
  saveProgress,
  loadProgress,
  setOnSaved,
} from './progress';

const BASE = 'https://sync.test';
const SECRET = 'sync-secret';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function deps(fetchFn: typeof fetch, now = 5000): SyncDeps {
  return { baseUrl: BASE, secret: SECRET, fetchFn, nowMs: () => now };
}

describe('sync pull/push', () => {
  beforeEach(() => {
    localStorage.clear();
    setOnSaved(null);
  });

  it('pull: 200 이면 updatedAt/data 파싱, Bearer 토큰 전송', async () => {
    let sentAuth: string | null = null;
    const fetchFn = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      sentAuth = new Headers(init?.headers).get('Authorization');
      return jsonResponse({ guestId: 'g1', updatedAt: 1234, data: { xp: 7 } });
    }) as unknown as typeof fetch;

    const pulled = await pullProgress('g1', deps(fetchFn));
    expect(pulled).toEqual({ updatedAt: 1234, data: { xp: 7 } });
    expect(sentAuth).toMatch(/^Bearer [0-9a-f]{64}$/);
  });

  it('pull: 404/비정상 본문이면 null', async () => {
    const f404 = (async () => new Response('{}', { status: 404 })) as unknown as typeof fetch;
    expect(await pullProgress('g1', deps(f404))).toBeNull();
    const fBad = (async () => jsonResponse({ updatedAt: 'x', data: 1 })) as unknown as typeof fetch;
    expect(await pullProgress('g1', deps(fBad))).toBeNull();
  });

  it('push: 200 이면 ok, 본문에 updatedAt/data 전송', async () => {
    let body: { updatedAt: number; data: Record<string, unknown> } | null = null;
    const fetchFn = (async (_url: unknown, init?: RequestInit) => {
      body = JSON.parse(String(init?.body));
      return jsonResponse({ ok: true });
    }) as unknown as typeof fetch;
    const res = await pushProgress('g1', 3000, { xp: 1 }, deps(fetchFn));
    expect(res.ok).toBe(true);
    expect(body!.updatedAt).toBe(3000);
    expect(body!.data).toEqual({ xp: 1 });
  });

  it('push: 409 면 conflict 로 서버 current 를 돌려준다', async () => {
    const fetchFn = (async () =>
      jsonResponse(
        { error: 'stale', current: { updatedAt: 8000, data: { xp: 9 } } },
        409,
      )) as unknown as typeof fetch;
    const res = await pushProgress('g1', 1000, { xp: 1 }, deps(fetchFn));
    expect(res.ok).toBe(false);
    expect(res.conflict).toEqual({ updatedAt: 8000, data: { xp: 9 } });
  });
});

describe('syncStartup', () => {
  beforeEach(() => {
    localStorage.clear();
    setOnSaved(null);
  });

  it('서버가 더 최신이면 로컬 blob 을 채택한다(미지 필드 포함)', async () => {
    ensureGuestId();
    localStorage.setItem('algofit:sync:updatedAt', '1000');
    const serverData = {
      schemaVersion: 6,
      xp: 500,
      level: 9,
      world2Nodes: ['cleared', 'current'],
    };
    const fetchFn = (async () =>
      jsonResponse({ updatedAt: 5000, data: serverData })) as unknown as typeof fetch;

    await syncStartup(deps(fetchFn));

    const raw = loadRawProgress();
    expect(raw.level).toBe(9);
    // 웹이 모르는 필드도 보존됨
    expect(raw.world2Nodes).toEqual(['cleared', 'current']);
    expect(localStorage.getItem('algofit:sync:updatedAt')).toBe('5000');
  });

  it('서버가 없거나 더 오래되면 로컬을 push 한다', async () => {
    ensureGuestId();
    localStorage.setItem('algofit:sync:updatedAt', '7000');
    let didPut = false;
    const fetchFn = (async (_url: unknown, init?: RequestInit) => {
      if (init?.method === 'PUT') {
        didPut = true;
        return jsonResponse({ ok: true });
      }
      return new Response('{}', { status: 404 });
    }) as unknown as typeof fetch;

    await syncStartup(deps(fetchFn));
    expect(didPut).toBe(true);
  });

  it('미설정(baseUrl/secret 없음)이면 아무 요청도 안 한다', async () => {
    const fetchFn = vi.fn() as unknown as typeof fetch;
    await syncStartup({ baseUrl: '', secret: '', fetchFn });
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe('passthrough (모바일 v6 필드 보존)', () => {
  beforeEach(() => {
    localStorage.clear();
    setOnSaved(null);
  });

  it('saveProgress 는 웹이 모르는 필드를 보존하고 schemaVersion 6 으로 저장한다', () => {
    // 모바일 blob 이 먼저 들어와 있다고 가정
    localStorage.setItem(
      'algofit:guestProgress',
      JSON.stringify({
        schemaVersion: 6,
        guestId: 'g1',
        xp: 0,
        world2Nodes: ['cleared'],
        unlockedBadgeIds: ['correct_10'],
      }),
    );
    const p = loadProgress();
    saveProgress({ ...p, xp: 123 });

    const raw = loadRawProgress();
    expect(raw.xp).toBe(123);
    expect(raw.schemaVersion).toBe(6);
    // 웹이 건드리지 않는 모바일 필드가 살아남음
    expect(raw.world2Nodes).toEqual(['cleared']);
    expect(raw.unlockedBadgeIds).toEqual(['correct_10']);
  });
});

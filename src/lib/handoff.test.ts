import { describe, expect, it } from 'vitest';
import { hmacHex } from './crypto';
import { verifyHandoffToken } from './handoff';

const SECRET = 'handoff-secret';

function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_');
}

/** 모바일 pc_handoff 와 동일한 방식으로 서명 토큰을 만든다. */
async function makeToken(
  guestId: string,
  exp: number,
  secret = SECRET,
): Promise<string> {
  const payload = `${guestId}|${exp}`;
  const mac = await hmacHex(secret, payload);
  return toBase64Url(`${payload}.${mac}`);
}

describe('verifyHandoffToken', () => {
  const future = 9_999_999_999_999;

  it('유효한 서명 토큰에서 guestId 를 복원한다', async () => {
    const token = await makeToken('guest-1', future);
    expect(await verifyHandoffToken(token, SECRET)).toBe('guest-1');
  });

  it('guestId 에 구분자가 없어도 lastIndexOf 로 안전 파싱', async () => {
    const token = await makeToken('uuid-with-no-pipe', future);
    expect(await verifyHandoffToken(token, SECRET)).toBe('uuid-with-no-pipe');
  });

  it('만료된 토큰은 null', async () => {
    const token = await makeToken('guest-1', 1000);
    expect(await verifyHandoffToken(token, SECRET, 2000)).toBeNull();
  });

  it('서명이 위조되면 null', async () => {
    const token = await makeToken('guest-1', future);
    const tampered = token.slice(0, -2) + (token.endsWith('aa') ? 'bb' : 'aa');
    expect(await verifyHandoffToken(tampered, SECRET)).toBeNull();
  });

  it('다른 secret 으로는 null', async () => {
    const token = await makeToken('guest-1', future);
    expect(await verifyHandoffToken(token, 'other-secret')).toBeNull();
  });

  it('secret 미설정이면 null', async () => {
    const token = await makeToken('guest-1', future);
    expect(await verifyHandoffToken(token, '')).toBeNull();
  });

  it('쓰레기 입력은 null (throw 하지 않음)', async () => {
    expect(await verifyHandoffToken('!!!not-base64!!!', SECRET)).toBeNull();
    expect(await verifyHandoffToken('', SECRET)).toBeNull();
  });
});

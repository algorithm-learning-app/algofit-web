import { hmacHex } from './crypto';
import { HANDOFF_SECRET } from './syncConfig';

const FIELD_SEP = '|';

/** base64url(UTF-8) → 문자열. 모바일 pc_handoff 의 base64Url.encode(utf8.encode(...)) 와 짝. */
function base64UrlToString(b64url: string): string {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * 모바일이 발급한 서명 handoff 토큰을 검증해 guestId 를 복원한다.
 * 토큰 = base64url("<guestId>|<exp>.<hmacHex>"), hmac = HMAC-SHA256(secret, "<guestId>|<exp>").
 * 서명 불일치/만료/형식오류면 null. secret 미설정 시에도 null(검증 불가).
 */
export async function verifyHandoffToken(
  token: string,
  secret: string = HANDOFF_SECRET,
  nowMs: number = Date.now(),
): Promise<string | null> {
  if (!token || !secret) return null;
  try {
    const decoded = base64UrlToString(token);
    const lastDot = decoded.lastIndexOf('.');
    if (lastDot <= 0) return null;

    const payload = decoded.slice(0, lastDot);
    const mac = decoded.slice(lastDot + 1);
    const expected = await hmacHex(secret, payload);
    if (mac !== expected) return null;

    const sep = payload.lastIndexOf(FIELD_SEP);
    if (sep <= 0) return null;
    const guestId = payload.slice(0, sep);
    const exp = Number(payload.slice(sep + 1));
    if (!Number.isFinite(exp) || nowMs > exp) return null;
    return guestId;
  } catch {
    return null;
  }
}

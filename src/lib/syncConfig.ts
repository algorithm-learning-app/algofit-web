import { hmacHex } from './crypto';

/**
 * 서버 동기화 설정. Vite 환경변수(빌드 시 주입)로만 켜진다.
 * 미주입(기본)이면 동기화·handoff 검증이 모두 비활성 → 현재 동작 무변경.
 *
 * - `VITE_SYNC_BASE_URL`  예) https://api.example.com
 * - `VITE_SYNC_SECRET`    algofit-server 의 SYNC_SECRET 과 동일
 * - `VITE_HANDOFF_SECRET` 모바일 HANDOFF_SECRET 과 동일(PC 이어하기 토큰 검증용)
 */
const env = import.meta.env as Record<string, string | undefined>;

export const SYNC_BASE_URL = env.VITE_SYNC_BASE_URL ?? '';
export const SYNC_SECRET = env.VITE_SYNC_SECRET ?? '';
export const HANDOFF_SECRET = env.VITE_HANDOFF_SECRET ?? '';

export const syncEnabled = SYNC_BASE_URL !== '' && SYNC_SECRET !== '';

/** 서버 인증 토큰 = HMAC-SHA256(secret, guestId) hex. 서버 verifyToken 과 동일 스킴.
 * 위협 모델: 시크릿이 번들에 임베드되고 만료가 없다 → 비민감 게스트 진행의 캐주얼
 * 덮어쓰기만 막는 게이트. 유출 시 SYNC_SECRET 로테이션으로 전 토큰 무효화. */
export function syncToken(
  guestId: string,
  secret: string = SYNC_SECRET,
): Promise<string> {
  return hmacHex(secret, guestId);
}

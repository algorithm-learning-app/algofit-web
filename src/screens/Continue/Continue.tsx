import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ensureGuestId,
  loadProgress,
  saveProgress,
  type GuestProgress,
} from '../../lib/progress';
import { verifyHandoffToken } from '../../lib/handoff';
import { applyPulled, pullProgress } from '../../lib/sync';
import './Continue.css';

type Status = 'idle' | 'working' | 'linked' | 'missing' | 'invalid';

/**
 * PC 이어하기.
 * - `?handoff=` : 모바일이 발급한 **서명 토큰**. HMAC 검증으로 guestId 복원 후 서버에서 진행을 받아 채택.
 * - `?token=`   : 레거시(원본 guestId 직접 연결, 서명 없음) — 하위호환 유지.
 */
export default function Continue() {
  const [params] = useSearchParams();
  const handoff = params.get('handoff')?.trim() ?? '';
  const legacyToken = params.get('token')?.trim() ?? '';
  const [progress, setProgress] = useState<GuestProgress | null>(null);
  const [status, setStatus] = useState<Status>('idle');

  const displayToken = useMemo(() => {
    const raw = handoff || legacyToken;
    if (!raw) return '';
    return raw.length > 12 ? `${raw.slice(0, 8)}…` : raw;
  }, [handoff, legacyToken]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (handoff) {
        setStatus('working');
        const guestId = await verifyHandoffToken(handoff);
        if (cancelled) return;
        if (!guestId) {
          setStatus('invalid');
          setProgress(loadProgress());
          return;
        }
        localStorage.setItem('algofit:guestId', guestId);
        const pulled = await pullProgress(guestId);
        if (cancelled) return;
        if (pulled) applyPulled(pulled);
        setProgress(loadProgress());
        setStatus('linked');
        return;
      }

      if (legacyToken) {
        localStorage.setItem('algofit:handoffToken', legacyToken);
        localStorage.setItem('algofit:guestId', legacyToken);
        const loaded = loadProgress();
        const linked: GuestProgress = { ...loaded, guestId: legacyToken };
        saveProgress(linked);
        if (cancelled) return;
        setProgress(linked);
        setStatus('linked');
        return;
      }

      setStatus('missing');
      setProgress(loadProgress());
    })();

    return () => {
      cancelled = true;
    };
  }, [handoff, legacyToken]);

  return (
    <div className="continue">
      <h1 className="continue__title">PC 이어하기</h1>

      {status === 'working' && (
        <p className="continue__lead">이어하기 토큰을 확인하는 중…</p>
      )}

      {status === 'invalid' && (
        <p className="continue__lead">
          이어하기 토큰이 올바르지 않거나 만료됐어요. 모바일 앱에서 PC 이어하기 QR/링크를
          다시 생성해 주세요.
        </p>
      )}

      {status === 'missing' && (
        <p className="continue__lead">
          URL에 이어하기 토큰이 없어요. 모바일 앱의 <code>PC 이어하기</code>에서 생성한
          링크로 접속하세요.
        </p>
      )}

      {status === 'linked' && (
        <p className="continue__lead">
          게스트 세션 <strong>{displayToken}</strong> 을(를) 이 브라우저에 연결했어요.
          서버 동기화가 켜져 있으면 진행이 함께 따라옵니다.
        </p>
      )}

      {progress && (
        <dl className="continue__stats">
          <div>
            <dt>Lv.</dt>
            <dd>
              {progress.level} · {progress.xp}/{progress.xpToNextLevel} XP
            </dd>
          </div>
          <div>
            <dt>스트릭</dt>
            <dd>{progress.streakCount}일</dd>
          </div>
          <div>
            <dt>오늘 Daily</dt>
            <dd>
              {progress.dailyProgress}/{progress.dailyTotal}
              {progress.todayDailyCompleted ? ' (완료)' : ''}
            </dd>
          </div>
        </dl>
      )}

      <div className="continue__actions">
        <Link to="/home" className="btn-primary">
          홈으로
        </Link>
        <Link to="/daily" className="btn-secondary">
          Daily 이어하기
        </Link>
        <Link to="/pc-bonus" className="btn-secondary">
          PC 보너스
        </Link>
      </div>

      <p className="continue__hint">
        현재 브라우저 guestId: <code>{ensureGuestId()}</code>
      </p>
    </div>
  );
}

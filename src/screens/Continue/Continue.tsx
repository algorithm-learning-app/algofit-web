import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ensureGuestId, loadProgress, saveProgress, type GuestProgress } from '../../lib/progress';
import './Continue.css';

const HANDOFF_KEY = 'algofit:handoffToken';

/**
 * MVP: `token` query is stored as guest handoff id and mapped to local guestId.
 * Mobile can open the PC URL with the same UUID as `algofit:guestId`.
 */
export default function Continue() {
  const [params] = useSearchParams();
  const token = params.get('token')?.trim() ?? '';
  const [progress, setProgress] = useState<GuestProgress | null>(null);
  const [status, setStatus] = useState<'idle' | 'linked' | 'missing'>('idle');

  const displayToken = useMemo(() => {
    if (!token) return '';
    return token.length > 12 ? `${token.slice(0, 8)}…` : token;
  }, [token]);

  useEffect(() => {
    if (!token) {
      setStatus('missing');
      setProgress(loadProgress());
      return;
    }

    localStorage.setItem(HANDOFF_KEY, token);
    localStorage.setItem('algofit:guestId', token);

    const loaded = loadProgress();
    const linked: GuestProgress = { ...loaded, guestId: token };
    saveProgress(linked);
    setProgress(linked);
    setStatus('linked');
  }, [token]);

  return (
    <div className="continue">
      <h1 className="continue__title">PC 이어하기</h1>

      {status === 'missing' && (
        <p className="continue__lead">
          URL에 <code>?token=</code> 게스트 ID가 필요해요. 모바일에서{' '}
          <code>algofit:guestId</code> 값을 복사해 붙여 넣으세요.
        </p>
      )}

      {status === 'linked' && (
        <p className="continue__lead">
          게스트 세션 <strong>{displayToken}</strong> 을(를) 이 브라우저에 연결했어요.
          Daily·PC 보너스 진행이 같은 localStorage를 씁니다.
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

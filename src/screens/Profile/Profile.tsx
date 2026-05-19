import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import BottomNav from '../../components/BottomNav';
import { ensureGuestId, loadProgress, type GuestProgress } from '../../lib/progress';
import './Profile.css';

export default function Profile() {
  const [progress, setProgress] = useState<GuestProgress | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  const copyText = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }, []);

  if (!progress) {
    return (
      <div className="profile profile--loading">
        <p>불러오는 중…</p>
      </div>
    );
  }

  const guestId = ensureGuestId();
  const continueUrl = `${window.location.origin}/continue?token=${encodeURIComponent(guestId)}`;
  const xpPercent = Math.min(
    100,
    Math.round((progress.xp / progress.xpToNextLevel) * 100),
  );

  return (
    <div className="profile">
      <header className="profile__header">
        <h1 className="profile__title">프로필</h1>
      </header>

      <main className="profile__main">
        <section className="profile-card" aria-labelledby="stats-title">
          <h2 id="stats-title" className="profile-card__title">
            게스트 진행
          </h2>
          <dl className="profile-stats">
            <div>
              <dt>guestId</dt>
              <dd>
                <code>{guestId}</code>
                <button
                  type="button"
                  className="profile-copy"
                  onClick={() => copyText(guestId, 'guestId')}
                >
                  복사
                </button>
              </dd>
            </div>
            <div>
              <dt>스트릭</dt>
              <dd>{progress.streakCount}일</dd>
            </div>
            <div>
              <dt>레벨</dt>
              <dd>Lv.{progress.level}</dd>
            </div>
            <div>
              <dt>XP</dt>
              <dd>
                {progress.xp} / {progress.xpToNextLevel}
                <div
                  className="xp-bar xp-bar--inline"
                  role="progressbar"
                  aria-valuenow={progress.xp}
                  aria-valuemin={0}
                  aria-valuemax={progress.xpToNextLevel}
                >
                  <div className="xp-bar__fill" style={{ width: `${xpPercent}%` }} />
                </div>
              </dd>
            </div>
            <div>
              <dt>하트</dt>
              <dd>{progress.hearts} / 5</dd>
            </div>
          </dl>
        </section>

        <section className="profile-card" aria-labelledby="handoff-title">
          <h2 id="handoff-title" className="profile-card__title">
            모바일 ↔ PC 연결
          </h2>
          <p className="profile-card__desc">
            모바일에서 복사한 링크를 PC에서 열거나, 아래 링크를 모바일로 공유하세요.
          </p>
          <p className="profile-card__url">
            <code>{continueUrl}</code>
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => copyText(continueUrl, 'link')}
          >
            PC 이어하기 링크 복사
          </button>
          <Link to={`/continue?token=${encodeURIComponent(guestId)}`} className="profile-card__link">
            이어하기 페이지 열기 →
          </Link>
        </section>
      </main>

      {copied ? (
        <p className="profile-toast" role="status">
          {copied === 'guestId' ? 'guestId' : '링크'} 복사됨
        </p>
      ) : null}

      <BottomNav />
    </div>
  );
}

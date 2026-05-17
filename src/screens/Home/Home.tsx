import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import BottomNav from '../../components/BottomNav';
import { ensureGuestId, loadProgress, type GuestProgress } from '../../lib/progress';
import './Home.css';

export default function Home() {
  const [progress, setProgress] = useState<GuestProgress | null>(null);

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  if (!progress) {
    return (
      <div className="home home--loading">
        <p className="home__loading-text">불러오는 중…</p>
      </div>
    );
  }

  const xpPercent = Math.min(
    100,
    Math.round((progress.xp / progress.xpToNextLevel) * 100),
  );

  return (
    <div className="home">
      <header className="home__header">
        <div className="streak-badge" aria-label={`스트릭 ${progress.streakCount}일`}>
          <span className="streak-badge__icon" aria-hidden>
            🔥
          </span>
          <span className="streak-badge__count">{progress.streakCount}</span>
        </div>

        <div className="level-block">
          <div className="level-block__row">
            <span className="level-block__label">Lv.{progress.level}</span>
            <span className="level-block__xp">
              {progress.xp} / {progress.xpToNextLevel} XP
            </span>
          </div>
          <div
            className="xp-bar"
            role="progressbar"
            aria-valuenow={progress.xp}
            aria-valuemin={0}
            aria-valuemax={progress.xpToNextLevel}
            aria-label="경험치"
          >
            <div className="xp-bar__fill" style={{ width: `${xpPercent}%` }} />
          </div>
        </div>
      </header>

      <main className="home__main">
        <section className="daily-card" aria-labelledby="daily-title">
          <div className="daily-card__top">
            <div>
              <h2 id="daily-title" className="daily-card__title">
                오늘의 챌린지
              </h2>
              <p className="daily-card__meta">
                Pick {progress.dailyPickCount} · Blank {progress.dailyBlankCount}
              </p>
            </div>
            <img
              className="daily-card__mascot"
              src="/algofit-mascot-neutral.png"
              alt=""
              width={72}
              height={72}
            />
          </div>

          <div className="progress-dots" aria-label={`진행 ${progress.dailyProgress}/${progress.dailyTotal}`}>
            {Array.from({ length: progress.dailyTotal }, (_, i) => (
              <span
                key={i}
                className={`progress-dots__dot${
                  i < progress.dailyProgress
                    ? ' progress-dots__dot--done'
                    : i === progress.dailyProgress
                      ? ' progress-dots__dot--current'
                      : ''
                }`}
              />
            ))}
          </div>
          <p className="daily-card__progress">
            {progress.dailyProgress}/{progress.dailyTotal}
          </p>
          <p className="daily-card__hint">5문제 전부 정답 시 스트릭</p>

          <Link to="/daily" className="btn-primary daily-card__cta">
            {progress.todayDailyCompleted ? '결과 보기' : progress.dailyProgress > 0 ? '이어하기' : '시작하기'}
          </Link>
        </section>

        <section className="handoff-card" aria-labelledby="handoff-title">
          <h2 id="handoff-title" className="handoff-card__title">
            모바일 ↔ PC 연결
          </h2>
          <p className="handoff-card__desc">
            모바일 게스트 ID로 PC에서 Daily·보너스를 이어할 수 있어요. 아래 링크를 PC
            브라우저에서 열거나 QR로 공유하세요.
          </p>
          <p className="handoff-card__id">
            guestId: <code>{ensureGuestId()}</code>
          </p>
          <Link
            to={`/continue?token=${encodeURIComponent(ensureGuestId())}`}
            className="handoff-card__link"
          >
            PC 이어하기 페이지 열기 →
          </Link>
        </section>

        <Link to="/pc-bonus" className="pc-bonus-card">
          <span className="pc-bonus-card__badge">보너스</span>
          <div className="pc-bonus-card__body">
            <p className="pc-bonus-card__title">PC에서 추가 XP</p>
            <p className="pc-bonus-card__desc">
              {progress.todayPcBonusCompleted
                ? '오늘 보너스 완료 · +50 XP'
                : '긴 빈칸 1문제 · +50 XP · 선택 참여'}
            </p>
          </div>
          <span className="pc-bonus-card__arrow" aria-hidden>
            →
          </span>
        </Link>

        <section className="world-preview" aria-labelledby="world-title">
          <div className="world-preview__head">
            <h2 id="world-title" className="world-preview__title">
              World 1
            </h2>
            <Link to="/learn" className="world-preview__link">
              맵 보기
            </Link>
          </div>
          <div className="world-preview__nodes" role="list">
            {progress.world1Nodes.map((state, index) => (
              <div
                key={index}
                role="listitem"
                className={`world-node world-node--${state}`}
                aria-label={`스테이지 ${index + 1}${state === 'locked' ? ' 잠금' : state === 'cleared' ? ' 완료' : ' 진행 중'}`}
              >
                <span className="world-node__num">{index + 1}</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}

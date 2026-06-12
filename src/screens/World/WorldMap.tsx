import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BottomNav from '../../components/BottomNav';
import {
  isWorldPlayable,
  loadProgress,
  nodesForWorld,
  type WorldNodeState,
} from '../../lib/progress';
import {
  WORLD2_UNLOCK_CLEARED_COUNT,
  worldById,
  type WorldStage,
} from '../../content/worldStages';
import './World.css';

function nodeStateFor(stage: WorldStage, nodes: WorldNodeState[]): WorldNodeState {
  const idx = stage.order - 1;
  return idx < nodes.length ? nodes[idx] : 'locked';
}

export default function WorldMap() {
  const navigate = useNavigate();
  const [worldId, setWorldId] = useState(1);
  const progress = loadProgress();

  const def = worldById(worldId);
  if (!def) {
    return (
      <div className="world">
        <p className="world__empty">World {worldId}은(는) 준비 중이에요.</p>
        <BottomNav />
      </div>
    );
  }

  const world2Unlocked = progress.world2Unlocked;
  const playable = isWorldPlayable(progress, worldId);
  const nodes = nodesForWorld(progress, worldId);
  const clearedCount = nodes.filter((n) => n === 'cleared').length;

  return (
    <div className="world">
      <header className="world__top">
        <Link to="/home" className="world__back">
          ← 홈
        </Link>
        <span className="world__count" aria-label={`클리어 ${clearedCount} / ${def.totalStages}`}>
          {clearedCount} / {def.totalStages}
        </span>
      </header>

      <div className="world__chips" role="tablist" aria-label="월드 선택">
        <button
          type="button"
          role="tab"
          aria-selected={worldId === 1}
          className={`world__chip${worldId === 1 ? ' world__chip--active' : ''}`}
          onClick={() => setWorldId(1)}
        >
          World 1
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={worldId === 2}
          className={`world__chip${worldId === 2 ? ' world__chip--active' : ''}${
            !world2Unlocked ? ' world__chip--locked' : ''
          }`}
          disabled={!world2Unlocked}
          onClick={() => world2Unlocked && setWorldId(2)}
        >
          World 2{!world2Unlocked ? ' 🔒' : ''}
        </button>
      </div>

      <h1 className="world__title">{def.title}</h1>
      <p className="world__subtitle">{def.subtitle}</p>

      {!playable ? (
        <section className="world__locked" aria-live="polite">
          <p className="world__locked-icon" aria-hidden>
            🔒
          </p>
          <p className="world__locked-text">
            World 1을 {WORLD2_UNLOCK_CLEARED_COUNT}스테이지 이상 클리어하면 열려요
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setWorldId(1)}
          >
            World 1으로
          </button>
        </section>
      ) : (
        <ol className="world__map" aria-label={`${def.title} 스테이지`}>
          {def.stages.map((stage, index) => {
            const state = nodeStateFor(stage, nodes);
            const tappable = state !== 'locked';
            const alignRight = index % 2 === 1;
            return (
              <li
                key={stage.id}
                className={`world__row${alignRight ? ' world__row--right' : ''}`}
              >
                <button
                  type="button"
                  className={`world-node world-node--${state}`}
                  disabled={!tappable}
                  aria-label={`스테이지 ${stage.order} ${stage.title}${
                    state === 'locked'
                      ? ' 잠금'
                      : state === 'cleared'
                        ? ' 완료'
                        : ' 진행 중'
                  }`}
                  onClick={() =>
                    tappable && navigate(`/learn/${worldId}/${stage.order}`)
                  }
                >
                  <span className="world-node__num">{stage.order}</span>
                </button>
                <span className="world__row-title">{stage.title}</span>
              </li>
            );
          })}
        </ol>
      )}

      <BottomNav />
    </div>
  );
}

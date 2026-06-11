import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { syncEnabled } from './lib/syncConfig';
import { syncStartup } from './lib/sync';
import './index.css';

function render() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
}

async function boot() {
  // 서버 동기화는 VITE_SYNC_* 주입 시에만. 시작 pull 이 느려도 앱을 막지 않도록
  // 짧은 타임아웃으로 경합시킨 뒤 렌더한다(이후 push/pull 은 백그라운드 지속).
  if (syncEnabled) {
    try {
      await Promise.race([
        syncStartup(),
        new Promise<void>((resolve) => setTimeout(resolve, 2500)),
      ]);
    } catch {
      // 동기화 실패는 무시 — 로컬 진행으로 정상 동작.
    }
  }
  render();
}

void boot();

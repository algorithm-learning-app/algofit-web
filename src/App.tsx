import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Home from './screens/Home/Home';
import DailyChallenge from './screens/Daily/DailyChallenge';
import Continue from './screens/Continue/Continue';
import Profile from './screens/Profile/Profile';
import PcBonusChallenge from './screens/PcBonus/PcBonusChallenge';
import WorldMap from './screens/World/WorldMap';
import StagePlay from './screens/World/StagePlay';
import './App.css';

export default function App() {
  // 서버 진행 채택(adopt) 시 화면들이 loadProgress() 를 다시 읽도록 라우트를 재마운트한다.
  const [adoptKey, setAdoptKey] = useState(0);
  useEffect(() => {
    const h = () => setAdoptKey((k) => k + 1);
    window.addEventListener('algofit:progress-adopted', h);
    return () => window.removeEventListener('algofit:progress-adopted', h);
  }, []);

  return (
    <div className="app-shell">
      <Routes key={adoptKey}>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<Home />} />
        <Route path="/continue" element={<Continue />} />
        <Route path="/daily" element={<DailyChallenge />} />
        <Route path="/daily/complete" element={<DailyChallenge />} />
        <Route path="/daily/:step/feedback" element={<DailyChallenge />} />
        <Route path="/daily/:step" element={<DailyChallenge />} />
        <Route path="/learn" element={<WorldMap />} />
        <Route path="/learn/:worldId/:stageOrder" element={<StagePlay />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/pc-bonus" element={<PcBonusChallenge />} />
        <Route path="/pc-bonus/feedback" element={<PcBonusChallenge />} />
        <Route path="/pc-bonus/complete" element={<PcBonusChallenge />} />
        <Route path="/pc/bonus" element={<PcBonusChallenge />} />
        <Route path="/bonus" element={<PcBonusChallenge />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </div>
  );
}

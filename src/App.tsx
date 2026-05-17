import { Link, Navigate, Route, Routes } from 'react-router-dom';
import Home from './screens/Home/Home';
import DailyChallenge from './screens/Daily/DailyChallenge';
import './App.css';

function Placeholder({ title }: { title: string }) {
  return (
    <div className="placeholder">
      <p>{title}</p>
      <Link to="/home">홈으로</Link>
    </div>
  );
}

export default function App() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<Home />} />
        <Route path="/daily" element={<DailyChallenge />} />
        <Route path="/daily/complete" element={<DailyChallenge />} />
        <Route path="/daily/:step/feedback" element={<DailyChallenge />} />
        <Route path="/daily/:step" element={<DailyChallenge />} />
        <Route path="/learn" element={<Placeholder title="학습 (준비 중)" />} />
        <Route path="/profile" element={<Placeholder title="프로필 (준비 중)" />} />
        <Route path="/pc-bonus" element={<Placeholder title="PC 보너스 (준비 중)" />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </div>
  );
}

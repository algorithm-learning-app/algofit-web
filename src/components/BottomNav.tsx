import { NavLink } from 'react-router-dom';
import './BottomNav.css';

const tabs = [
  { to: '/home', label: '홈', icon: '🏠' },
  { to: '/learn', label: '학습', icon: '📚' },
  { to: '/profile', label: '프로필', icon: '👤' },
] as const;

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="주요 메뉴">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            `bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`
          }
          end={tab.to === '/home'}
        >
          <span className="bottom-nav__icon" aria-hidden>
            {tab.icon}
          </span>
          <span className="bottom-nav__label">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import App from './App';
import Continue from './screens/Continue/Continue';
import Profile from './screens/Profile/Profile';

describe('routes', () => {
  it('/profile 은 프로필 화면을 렌더한다', () => {
    render(
      <MemoryRouter initialEntries={['/profile']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: /프로필/i })).toBeInTheDocument();
  });

  it('/continue?token= 은 게스트 ID를 localStorage에 연결한다', async () => {
    const token = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    render(
      <MemoryRouter initialEntries={[`/continue?token=${token}`]}>
        <Routes>
          <Route path="/continue" element={<Continue />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/연결했어요/i)).toBeInTheDocument();
    expect(localStorage.getItem('algofit:guestId')).toBe(token);
    expect(localStorage.getItem('algofit:handoffToken')).toBe(token);
  });

  it('Profile은 guestId를 표시한다', () => {
    const guestId = 'test-guest-id-1234';
    localStorage.setItem('algofit:guestId', guestId);
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );
    expect(screen.getByText(guestId)).toBeInTheDocument();
  });
});

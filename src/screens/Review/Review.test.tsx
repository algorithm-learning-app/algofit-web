import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import Review from './Review';
import { loadQuestionPools, type PickQuestion } from '../../lib/daily';

const STORAGE_KEY = 'algofit:guestProgress';

function firstPick(): PickQuestion {
  return loadQuestionPools().picks[0];
}

function seedWrong(ids: string[]): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      schemaVersion: 6,
      xp: 0,
      level: 1,
      xpToNextLevel: 100,
      wrongQuestionIds: ids,
    }),
  );
}

function renderReview() {
  return render(
    <MemoryRouter initialEntries={['/review']}>
      <Routes>
        <Route path="/review" element={<Review />} />
        <Route path="/home" element={<div>홈 화면</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Review 화면', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('오답이 없으면 empty state 를 렌더한다', () => {
    renderReview();
    expect(screen.getByText('복습할 오답이 없어요')).toBeInTheDocument();
  });

  it('스테일 id 는 무시하고 풀에 존재하는 오답만 보여준다', () => {
    const pick = firstPick();
    seedWrong([pick.id, '__stale_unknown__']);
    renderReview();
    expect(screen.getByText('복습할 오답 1개')).toBeInTheDocument();
    expect(screen.getByText(pick.stem)).toBeInTheDocument();
  });

  it('재풀이로 정답을 맞히면 풀에서 빠지고 목록이 비워진다', () => {
    const pick = firstPick();
    seedWrong([pick.id]);
    renderReview();

    // 목록에서 항목을 눌러 재풀이 시작.
    fireEvent.click(screen.getByText(pick.stem));

    // 정답 선택지를 골라 확인.
    const correctLabel = pick.choices.find((c) => c.id === pick.correctChoiceId)!.label;
    fireEvent.click(screen.getByText(correctLabel));
    fireEvent.click(screen.getByRole('button', { name: '확인' }));

    // 정답 피드백 → 목록으로.
    expect(screen.getByText('정답!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '목록으로' }));

    // 풀이 비어 empty state.
    expect(screen.getByText('복습할 오답이 없어요')).toBeInTheDocument();
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as Record<
      string,
      unknown
    >;
    expect(saved.wrongQuestionIds).toEqual([]);
    expect(saved.clearedQuestionIds).toEqual([pick.id]);
  });

  it('재풀이에서 오답이면 풀에 남고 목록에 유지된다', () => {
    const pick = firstPick();
    seedWrong([pick.id]);
    renderReview();

    fireEvent.click(screen.getByText(pick.stem));
    const wrongLabel = pick.choices.find((c) => c.id !== pick.correctChoiceId)!.label;
    fireEvent.click(screen.getByText(wrongLabel));
    fireEvent.click(screen.getByRole('button', { name: '확인' }));

    expect(screen.getByText('오답')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '다시 풀기' }));

    // 여전히 목록에 남아 있다.
    expect(screen.getByText('복습할 오답 1개')).toBeInTheDocument();
  });
});

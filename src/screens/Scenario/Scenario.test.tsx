import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import Scenario from './Scenario';
import { loadProgress } from '../../lib/progress';
import { loadScenarios } from '../../lib/scenario';

const STORAGE_KEY = 'algofit:guestProgress';

function renderScenario() {
  return render(
    <MemoryRouter initialEntries={['/scenario']}>
      <Routes>
        <Route path="/scenario" element={<Scenario />} />
        <Route path="/home" element={<div>홈 화면</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Scenario 화면', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('세션 첫 문항(지문·선택지·확인)을 렌더한다', () => {
    loadProgress();
    renderScenario();
    expect(screen.getByText('실전 시나리오')).toBeInTheDocument();
    expect(screen.getByText('어떤 패턴으로 풀까요?')).toBeInTheDocument();
    expect(screen.getByTestId('scenario-choice-0')).toBeInTheDocument();
    // 선택 전 확인 버튼은 비활성.
    expect(screen.getByRole('button', { name: '확인' })).toBeDisabled();
  });

  it('정답을 고르면 피드백(정답 + XP)으로 전환된다', () => {
    loadProgress();
    const all = loadScenarios();
    renderScenario();

    // 세션은 셔플되므로 화면에 실제 렌더된 문항을 정답 선택지 라벨로 식별한다.
    const rendered = all.find((q) =>
      q.patternChoices.every((c) => screen.queryByText(c.label) !== null),
    )!;
    const correctChoice = rendered.patternChoices.find((c) =>
      rendered.primaryPatternIds.includes(c.id),
    )!;
    fireEvent.click(screen.getByText(correctChoice.label));
    fireEvent.click(screen.getByRole('button', { name: '확인' }));

    expect(screen.getByText('정답!')).toBeInTheDocument();
    expect(screen.getByText('+15 XP')).toBeInTheDocument();

    // XP 만 적립되고 복습 풀(cleared/wrong)은 건드리지 않는다.
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as Record<
      string,
      unknown
    >;
    expect(saved.xp).toBe(15);
    expect(saved.clearedQuestionIds).toBeUndefined();
    expect(saved.wrongQuestionIds).toBeUndefined();
  });
});

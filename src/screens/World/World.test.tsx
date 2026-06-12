import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import WorldMap from './WorldMap';
import StagePlay from './StagePlay';
import { loadProgress } from '../../lib/progress';
import { WORLD1_TOTAL_STAGES } from '../../content/worldStages';
import { resolveStageQuestions } from '../../content/stageQuestions';
import {
  checkPickAnswer,
  checkBlankAnswer,
  isPickQuestion,
  type DailyQuestion,
} from '../../lib/daily';

const STORAGE_KEY = 'algofit:guestProgress';

function renderApp(initial: string) {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/learn" element={<WorldMap />} />
        <Route path="/learn/:worldId/:stageOrder" element={<StagePlay />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** 정답 선택지를 골라 문항을 푼다(pick/blank 공용). */
function answerQuestion(question: DailyQuestion): void {
  if (isPickQuestion(question)) {
    const correct = question.choices.find((c) => checkPickAnswer(question, c.id))!;
    fireEvent.click(screen.getByText(correct.label));
  } else {
    for (const slot of question.blanks) {
      const correct = slot.choices.find((c) =>
        checkBlankAnswer(question, { [slot.id]: c }),
      );
      // 모든 빈칸이 한 번에 검사되므로 슬롯별 정답을 개별 선택.
      const pickFor = slot.correctAnswers.find((a) => slot.choices.includes(a))!;
      const buttons = screen.getAllByText(correct ?? pickFor);
      fireEvent.click(buttons[buttons.length - 1]);
    }
  }
  fireEvent.click(screen.getByRole('button', { name: '확인' }));
}

describe('WorldMap 화면', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('World 1 을 20개 노드로 렌더한다', () => {
    renderApp('/learn');
    expect(screen.getByRole('heading', { name: 'World 1' })).toBeInTheDocument();
    const map = screen.getByRole('list', { name: /World 1 스테이지/ });
    const nodes = within(map).getAllByRole('button');
    expect(nodes).toHaveLength(WORLD1_TOTAL_STAGES);
  });

  it('초기에는 World 2 가 잠겨 있다(탭 비활성)', () => {
    renderApp('/learn');
    const world2Tab = screen.getByRole('tab', { name: /World 2/ });
    expect(world2Tab).toBeDisabled();
  });

  it('잠긴 노드는 탭할 수 없다(비활성)', () => {
    renderApp('/learn');
    const map = screen.getByRole('list', { name: /World 1 스테이지/ });
    const nodes = within(map).getAllByRole('button');
    expect(nodes[0]).not.toBeDisabled(); // 1번 current
    expect(nodes[1]).toBeDisabled(); // 2번 locked
  });
});

describe('StagePlay 화면', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('스테이지를 렌더하고 끝까지 풀면 클리어 처리된다', () => {
    loadProgress(); // 기본 진행 초기화 (stage 1 = current)
    renderApp('/learn/1/1');

    const questions = resolveStageQuestions('stage_w1_01');
    for (const q of questions) {
      answerQuestion(q);
      // 정답 피드백 → 다음
      fireEvent.click(screen.getByRole('button', { name: /다음|맵으로 돌아가기/ }));
    }

    expect(screen.getByText('스테이지 클리어!')).toBeInTheDocument();
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as {
      world1Nodes: string[];
    };
    expect(saved.world1Nodes[0]).toBe('cleared');
    expect(saved.world1Nodes[1]).toBe('current');
  });

  it('잠긴 스테이지는 잠금 안내를 보여준다', () => {
    loadProgress();
    renderApp('/learn/1/5'); // stage 5 = locked
    expect(screen.getByText(/잠긴 스테이지/)).toBeInTheDocument();
  });
});

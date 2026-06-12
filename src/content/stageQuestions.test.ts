import { describe, expect, it } from 'vitest';
import {
  findMissingStageQuestionIds,
  resolveStageQuestions,
  stageQuestions,
  STAGE_MINI_SET_SIZE,
} from './stageQuestions';
import { world1Stages, world2Stages } from './worldStages';

describe('스테이지 → 문항 매핑 (콘텐츠 드리프트 가드)', () => {
  it('모든 스테이지의 매핑 문항 id 가 pick/blank 풀에 존재한다', () => {
    expect(findMissingStageQuestionIds()).toEqual([]);
  });

  it('World 1·2 모든 스테이지가 매핑을 가진다', () => {
    for (const stage of [...world1Stages, ...world2Stages]) {
      expect(stageQuestions[stage.id], `${stage.id} 매핑 없음`).toBeDefined();
    }
  });

  it('각 스테이지는 미니 세트 크기만큼 문항을 해석한다', () => {
    for (const stage of [...world1Stages, ...world2Stages]) {
      const resolved = resolveStageQuestions(stage.id);
      expect(resolved.length, `${stage.id}`).toBe(STAGE_MINI_SET_SIZE);
    }
  });
});

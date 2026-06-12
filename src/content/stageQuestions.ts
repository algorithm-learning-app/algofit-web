// 스테이지 → 문항 미니 세트 매핑 — apps/mobile/lib/data/world1_stage_questions.dart /
// world2_stage_questions.dart / stage_questions.dart 포팅.
//
// 문항 id 는 기존 웹 풀(src/content/pick.json + blank.json)에서 해석한다(모바일 에셋과 동일 id).
// 누락 id 는 resolveStageQuestions 에서 graceful 하게 걸러지고 reportMissingStageQuestionIds 로 보고된다.

import { loadQuestionPools, type DailyQuestion } from '../lib/daily';

export type StageQuestionKind = 'pick' | 'blank';

export type StageQuestionRef = {
  questionId: string;
  kind: StageQuestionKind;
};

/** 스테이지 1회 플레이당 문항 수. */
export const STAGE_MINI_SET_SIZE = 2;

function pick(id: string): StageQuestionRef {
  return { questionId: id, kind: 'pick' };
}
function blank(id: string): StageQuestionRef {
  return { questionId: id, kind: 'blank' };
}

export const stageQuestions: Record<string, StageQuestionRef[]> = {
  // World 1
  stage_w1_01: [pick('pick_arr_001'), pick('pick_arr_007')],
  stage_w1_02: [pick('pick_arr_005'), blank('blank_arr_001')],
  stage_w1_03: [pick('pick_arr_001'), pick('pick_arr_004')],
  stage_w1_04: [pick('pick_arr_004'), pick('pick_arr_002')],
  stage_w1_05: [pick('pick_stage_tp_001'), pick('pick_tp_002')],
  stage_w1_06: [blank('blank_tp_001'), pick('pick_tp_003')],
  stage_w1_07: [pick('pick_tp_003'), pick('pick_tp_007')],
  stage_w1_08: [pick('pick_tp_002'), pick('pick_str_001')],
  stage_w1_09: [pick('pick_hash_004'), pick('pick_hash_006')],
  stage_w1_10: [blank('blank_hash_001'), pick('pick_hash_002')],
  stage_w1_11: [pick('pick_hash_003'), pick('pick_hash_005')],
  stage_w1_12: [blank('blank_hash_002'), pick('pick_hash_007')],
  stage_w1_13: [pick('pick_stage_bs_001'), pick('pick_bs_006')],
  stage_w1_14: [blank('blank_bs_001'), pick('pick_bs_007')],
  stage_w1_15: [pick('pick_bs_005'), pick('pick_bs_004')],
  stage_w1_16: [pick('pick_arr_008'), pick('pick_bs_002')],
  stage_w1_17: [pick('pick_tp_004'), pick('pick_hash_005')],
  stage_w1_18: [pick('pick_mix_001'), pick('pick_arr_006')],
  stage_w1_19: [pick('pick_tp_006'), pick('pick_tp_007')],
  stage_w1_20: [pick('pick_arr_009'), blank('blank_bs_002')],
  // World 2
  stage_w2_01: [pick('pick_stage_stack_001'), pick('pick_stack_005')],
  stage_w2_02: [blank('blank_stack_001'), pick('pick_stack_006')],
  stage_w2_03: [blank('blank_stack_002'), pick('pick_stack_003')],
  stage_w2_04: [pick('pick_stage_bfs_001'), pick('pick_bfs_003')],
  stage_w2_05: [blank('blank_bfs_001'), pick('pick_bfs_004')],
  stage_w2_06: [pick('pick_stack_007'), pick('pick_stack_008')],
  stage_w2_07: [blank('blank_stack_003'), pick('pick_stack_009')],
  stage_w2_08: [pick('pick_bfs_005'), blank('blank_bfs_002')],
  stage_w2_09: [pick('pick_bfs_006'), pick('pick_bfs_007')],
  stage_w2_10: [pick('pick_bfs_008'), blank('blank_bfs_003')],
  stage_w2_11: [pick('pick_stack_001'), blank('blank_stack_005')],
  stage_w2_12: [pick('pick_stack_002'), blank('blank_stack_004')],
  stage_w2_13: [pick('pick_bfs_001'), blank('blank_bfs_004')],
  stage_w2_14: [pick('pick_bfs_009'), blank('blank_bfs_005')],
  stage_w2_15: [pick('pick_stack_004'), pick('pick_bfs_002')],
};

export function hasStageContent(stageId: string): boolean {
  return stageId in stageQuestions;
}

export function stageQuestionRefs(stageId: string): StageQuestionRef[] {
  return stageQuestions[stageId] ?? [];
}

export function stageQuestionCount(stageId: string): number {
  return stageQuestionRefs(stageId).length;
}

/**
 * 스테이지가 참조하는 문항 ref 중 풀에서 실제로 찾을 수 있는 [DailyQuestion] 만 해석한다.
 * 누락된 id 는 결과에서 빠지고 맵을 깨뜨리지 않는다(graceful).
 */
export function resolveStageQuestions(stageId: string): DailyQuestion[] {
  const refs = stageQuestionRefs(stageId);
  if (refs.length === 0) return [];
  const { picks, blanks } = loadQuestionPools();
  const pickById = new Map(picks.map((q) => [q.id, q]));
  const blankById = new Map(blanks.map((q) => [q.id, q]));
  const out: DailyQuestion[] = [];
  for (const ref of refs) {
    const found =
      ref.kind === 'blank' ? blankById.get(ref.questionId) : pickById.get(ref.questionId);
    if (found) out.push(found);
  }
  return out;
}

export type MissingStageQuestion = {
  stageId: string;
  questionId: string;
  kind: StageQuestionKind;
};

/**
 * 모든 스테이지 매핑 id 가 풀에 존재하는지 검증한다. 콘텐츠 드리프트 가드/테스트용.
 * 존재하지 않는 ref 목록을 반환한다(빈 배열 = 모두 존재).
 */
export function findMissingStageQuestionIds(): MissingStageQuestion[] {
  const { picks, blanks } = loadQuestionPools();
  const pickIds = new Set(picks.map((q) => q.id));
  const blankIds = new Set(blanks.map((q) => q.id));
  const missing: MissingStageQuestion[] = [];
  for (const [stageId, refs] of Object.entries(stageQuestions)) {
    for (const ref of refs) {
      const exists = ref.kind === 'blank' ? blankIds.has(ref.questionId) : pickIds.has(ref.questionId);
      if (!exists) {
        missing.push({ stageId, questionId: ref.questionId, kind: ref.kind });
      }
    }
  }
  return missing;
}

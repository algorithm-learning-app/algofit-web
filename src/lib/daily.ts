import dailyPack from '../content/daily-sample.json';

export type PickQuestion = {
  id: string;
  type: 'pick';
  version: number;
  language: string;
  stem: string;
  tags: string[];
  difficulty: number;
  choices: Array<{ id: string; label: string }>;
  correctChoiceId: string;
  explanation: string;
  feedbackCorrect: string;
  feedbackWrong: string;
};

export type BlankSlot = {
  id: string;
  correctAnswers: string[];
  choices: string[];
};

export type BlankQuestion = {
  id: string;
  type: 'blank';
  version: number;
  language: string;
  stem: string;
  tags: string[];
  difficulty: number;
  codeTemplate: string;
  blanks: BlankSlot[];
  explanation: string;
  feedbackCorrect: string;
  feedbackWrong: string;
};

export type DailyQuestion = PickQuestion | BlankQuestion;

export type DailyPack = {
  id: string;
  title: string;
  questions: DailyQuestion[];
};

export const DAILY_TOTAL = 5;
export const DAILY_XP_PER_QUESTION = 10;

export function getDailyPack(): DailyPack {
  return dailyPack as DailyPack;
}

export function getDailyQuestion(index: number): DailyQuestion | undefined {
  return getDailyPack().questions[index];
}

export function isPickQuestion(q: DailyQuestion): q is PickQuestion {
  return q.type === 'pick';
}

export function isBlankQuestion(q: DailyQuestion): q is BlankQuestion {
  return q.type === 'blank';
}

export function checkPickAnswer(q: PickQuestion, choiceId: string): boolean {
  return choiceId === q.correctChoiceId;
}

export function checkBlankAnswer(
  q: BlankQuestion,
  selections: Record<string, string>,
): boolean {
  return q.blanks.every((slot) => {
    const picked = selections[slot.id];
    if (!picked) return false;
    return slot.correctAnswers.includes(picked);
  });
}

export function renderCodeWithSelections(
  template: string,
  selections: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, id: string) => {
    const value = selections[id];
    return value ?? `{{${id}}}`;
  });
}

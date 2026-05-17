import bonusPack from '../content/pc-bonus-long-blank.json';
import type { BlankQuestion } from './daily';
import { checkBlankAnswer, renderCodeWithSelections } from './daily';

export type PcBonusPack = {
  id: string;
  title: string;
  question: BlankQuestion;
};

export const PC_BONUS_XP = 50;

export function getPcBonusPack(): PcBonusPack {
  return bonusPack as PcBonusPack;
}

export function getPcBonusQuestion(): BlankQuestion {
  return getPcBonusPack().question;
}

export { checkBlankAnswer, renderCodeWithSelections };

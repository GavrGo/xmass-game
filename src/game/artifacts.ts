import { ЧЁРНЫЙ_РЫНОК } from "../config";
import type { User } from "../types";

export type КлючАртефакта = keyof typeof ЧЁРНЫЙ_РЫНОК.артефакты;
export const КЛЮЧИ_АРТЕФАКТОВ = Object.keys(ЧЁРНЫЙ_РЫНОК.артефакты) as КлючАртефакта[];

export const естьАртефакт = (u: Pick<User, "artifacts"> | null | undefined, ключ: КлючАртефакта): boolean =>
  !!u?.artifacts?.includes(ключ);

// Строка игрока в таблице users (названия полей = названия колонок в Supabase)
export interface User {
  telegram_id: number;
  nickname: string;
  emoji: string;
  chips: number;
  tickets: number;
  hearts: number;
  free_spin_level: number;
  salary_level: number;
  artifacts?: string[]; // купленные артефакты чёрного рынка (ключи из ЧЁРНЫЙ_РЫНОК.артефакты)
  slot_spins?: number;
  mastery?: Record<string, { xp: number }>;
  exchange_fee: number; // комиссия обмена в % (меняется в Black Jack с торговцем)
  time_level: number;
  exchange_level: number; // уровень прокачки «Договоримся» (снижает курс обмена фишек на билеты)
  trash_level: number; // уровень прокачки «Убрать мусор»
  slot_pity: number;
  best_ksuha_run: number;
  puzzles_solved: number;
  best_match3: number;
  best_jira_level: number;
  best_babka_crash: number;
  best_drift_boss: number;
  banned?: boolean;
  created_at: string;
  updated_at: string;
}

export const КОЛОНКА_УРОВНЯ = {
  freeSpin: "free_spin_level",
  salary: "salary_level",
  timeBonus: "time_level",
  exchange: "exchange_level",
  trash: "trash_level",
} as const;

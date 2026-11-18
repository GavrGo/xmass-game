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
  exchange_fee: number; // комиссия обмена в % (меняется в Black Jack с торговцем)
  time_level: number;
  trash_level: number; // уровень прокачки «Убрать мусор»
  best_ksuha_run: number;
  puzzles_solved: number;
  best_match3: number;
  best_jira_level: number;
  best_babka_crash: number;
  created_at: string;
  updated_at: string;
}

export const КОЛОНКА_УРОВНЯ = {
  freeSpin: "free_spin_level",
  salary: "salary_level",
  timeBonus: "time_level",
  trash: "trash_level",
} as const;

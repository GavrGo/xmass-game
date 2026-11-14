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
  exchange_level: number;
  time_level: number;
  best_ksuha_run: number; // личный рекорд Ksuha Run (препятствий)
  created_at: string;
  updated_at: string;
}

// Соответствие ключа прокачки и колонки в базе
export const КОЛОНКА_УРОВНЯ = {
  freeSpin: "free_spin_level",
  salary: "salary_level",
  exchange: "exchange_level",
  timeBonus: "time_level",
} as const;

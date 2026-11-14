// Все запросы к базе про игроков и админов — только здесь.
// Позже сюда же добавим функции слота, обмена и т.д.
import { supabase } from "../lib/supabase";
import { СТАРТ } from "../config";
import type { User } from "../types";

export async function getUser(telegramId: number): Promise<User | null> {
  const { data, error } = await supabase
    .from("users").select("*").eq("telegram_id", telegramId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createUser(telegramId: number, nickname: string, emoji: string): Promise<User> {
  const { data, error } = await supabase
    .from("users")
    .insert({
      telegram_id: telegramId,
      nickname,
      emoji,
      chips: СТАРТ.фишки,
      tickets: СТАРТ.билеты,
      hearts: СТАРТ.хэпэшки,
    })
    .select().single();
  if (error) throw error;
  return data;
}

export async function updateUser(telegramId: number, patch: Partial<User>): Promise<User> {
  const { data, error } = await supabase
    .from("users").update(patch).eq("telegram_id", telegramId).select().single();
  if (error) throw error;
  return data;
}

export async function listUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from("users").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function deleteUser(telegramId: number): Promise<void> {
  const { error } = await supabase.from("users").delete().eq("telegram_id", telegramId);
  if (error) throw error;
}

export async function isAdmin(telegramId: number): Promise<boolean> {
  const { data, error } = await supabase
    .from("admins").select("telegram_id").eq("telegram_id", telegramId).maybeSingle();
  if (error) throw error;
  return !!data;
}

export type КолонкаРекорда = "best_ksuha_run" | "best_match3_stage";
export interface Рекорд { telegram_id: number; nickname: string; значение: number }

/** Глобальный рекорд в игре: кто и сколько (максимум среди всех игроков). */
export async function getGlobalRecord(колонка: КолонкаРекорда): Promise<Рекорд | null> {
  const { data, error } = await supabase
    .from("users")
    .select(`telegram_id, nickname, ${колонка}`)
    .order(колонка, { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const строка = data as any;
  return { telegram_id: строка.telegram_id, nickname: строка.nickname, значение: строка[колонка] ?? 0 };
}

// ---------- Лидерборд ----------
export interface СтрокаЛидерборда {
  telegram_id: number;
  nickname: string;
  emoji: string;
  hearts: number;
}

/** Топ игроков по хэпэшкам (при равенстве выше тот, кто зарегистрировался раньше). */
export async function getLeaderboard(limit: number): Promise<СтрокаЛидерборда[]> {
  const { data, error } = await supabase
    .from("users")
    .select("telegram_id, nickname, emoji, hearts")
    .order("hearts", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

/** Место игрока: 1 + количество игроков, у которых хэпэшек строго больше. */
export async function getPlaceByHearts(hearts: number): Promise<number> {
  const { count, error } = await supabase
    .from("users")
    .select("telegram_id", { count: "exact", head: true })
    .gt("hearts", hearts);
  if (error) throw error;
  return (count ?? 0) + 1;
}

// ---------- Пятнашки ----------
export interface ЛидерПазлов { telegram_id: number; nickname: string; count: number }

/** Игрок, собравший больше всех пазлов за всё время. */
export async function getPuzzleLeader(): Promise<ЛидерПазлов | null> {
  const { data, error } = await supabase
    .from("users")
    .select("telegram_id, nickname, puzzles_solved")
    .order("puzzles_solved", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { telegram_id: data.telegram_id, nickname: data.nickname, count: data.puzzles_solved ?? 0 };
}

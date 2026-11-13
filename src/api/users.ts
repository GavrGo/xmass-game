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

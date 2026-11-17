import { supabase } from "../lib/supabase";

export type Выбор = "rock" | "scissors" | "paper";
export const ВЫБОРЫ: { ключ: Выбор; эмодзи: string }[] = [
  { ключ: "rock", эмодзи: "🪨" },
  { ключ: "scissors", эмодзи: "✂️" },
  { ключ: "paper", эмодзи: "📄" },
];
export const эмодзиВыбора = (в: Выбор | null) => ВЫБОРЫ.find((x) => x.ключ === в)?.эмодзи ?? "❔";

export interface Дуэль {
  id: string;
  challenger_id: number;
  target_id: number;
  bet: number;
  challenger_pick: Выбор;
  target_pick: Выбор | null;
  status: "pending" | "declined" | "expired" | "finished";
  winner_id: number | null;
  expires_at: string;
}

type ВидСообщения = "challenge" | "declined" | "missed" | "won" | "lost" | "draw";

export function уведомить(kind: ВидСообщения, to: number, name: string, amount = 0) {
  fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, to, name, amount }),
  }).catch(() => {});
}

async function вызов(имя: string, args: Record<string, unknown>): Promise<Дуэль> {
  const { data, error } = await supabase.rpc(имя, args);
  if (error) throw new Error(error.message);
  return data as Дуэль;
}

export const создатьДуэль = (я: number, цель: number, выбор: Выбор, ставка: number) =>
  вызов("duel_create", { p_challenger: я, p_target: цель, p_pick: выбор, p_bet: ставка });
export const отказатьсяОтДуэли = (id: string, я: number) => вызов("duel_decline", { p_id: id, p_user: я });
export const принятьДуэль = (id: string, я: number, выбор: Выбор) =>
  вызов("duel_accept", { p_id: id, p_user: я, p_pick: выбор });

export async function моиДуэли(я: number): Promise<Дуэль[]> {
  const { data, error } = await supabase
    .from("duels").select("*").eq("status", "pending")
    .or(`challenger_id.eq.${я},target_id.eq.${я}`);
  if (error) throw error;
  return (data ?? []) as Дуэль[];
}

/** Закрывает дуэли старше 24 часов, возвращает ставки и шлёт сообщения. Безопасно вызывать с любого устройства. */
export async function обработатьПросроченные() {
  const { data, error } = await supabase.rpc("duel_expire_due");
  const список = (data ?? []) as Дуэль[];
  if (error || !список.length) return;
  const ids = [...new Set(список.flatMap((д) => [д.challenger_id, д.target_id]))];
  const { data: люди } = await supabase.from("users").select("telegram_id, nickname").in("telegram_id", ids);
  const имя = (id: number) => люди?.find((x) => x.telegram_id === id)?.nickname ?? "Игрок";
  for (const д of список) {
    уведомить("declined", д.challenger_id, имя(д.target_id));
    уведомить("missed", д.target_id, имя(д.challenger_id));
  }
}

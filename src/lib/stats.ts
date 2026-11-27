import { supabase } from "./supabase";
import { getTelegramId } from "./telegram";

export type ПолеСтатистики =
  | "seconds_in_game" | "slot_spins" | "wheel_spins"
  | "plays_ksuha" | "plays_match3" | "plays_puzzle" | "plays_jira" | "plays_babka" | "plays_blackjack" | "plays_drift"
  | "wheel_x3" | "wheel_x5" | "wheel_x10" | "wheel_x100" | "wheel_wins" | "wheel_losses" | "slot_bombs";

export function стат(поле: ПолеСтатистики, n = 1) {
  const id = getTelegramId();
  if (!id || n < 1) return;
  supabase.rpc("stat_inc", { p_id: id, p_field: поле, p_n: n }).then(() => {}, () => {});
}

export function статМакс(поле: "max_wheel_win_bet" | "max_wheel_loss_bet", значение: number) {
  const id = getTelegramId();
  if (!id || значение < 1) return;
  supabase.rpc("stat_max", { p_id: id, p_field: поле, p_value: значение }).then(() => {}, () => {});
}

let запущено = false;

/** Считает секунды, пока приложение открыто и видно; отправляет раз в 30 с и при сворачивании. */
export function запуститьУчётВремени() {
  if (запущено) return;
  запущено = true;
  let накоплено = 0;
  const отправить = () => { if (накоплено > 0) { стат("seconds_in_game", накоплено); накоплено = 0; } };
  setInterval(() => {
    if (document.visibilityState === "visible") накоплено += 1;
    if (накоплено >= 30) отправить();
  }, 1000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") отправить(); });
  window.addEventListener("pagehide", отправить);
}

export interface СтрокаСтатистики {
  telegram_id: number;
  seconds_in_game: number;
  slot_spins: number;
  wheel_spins: number;
  plays_ksuha: number;
  plays_match3: number;
  plays_puzzle: number;
  plays_jira: number;
  plays_babka: number;
  plays_blackjack: number;
  plays_drift: number;
  duels_sent: number;
  wheel_x3?: number;
  wheel_x5?: number;
  wheel_x10?: number;
  wheel_x100?: number;
  wheel_wins?: number;
  wheel_losses?: number;
  slot_bombs?: number;
  max_wheel_win_bet?: number;
  max_wheel_loss_bet?: number;
}

export async function загрузитьСтатистику(): Promise<СтрокаСтатистики[]> {
  const { data, error } = await supabase.from("user_stats").select("*");
  if (error) throw error;
  return data ?? [];
}

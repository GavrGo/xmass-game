import { supabase } from "../lib/supabase";
import { Т } from "../texts";

export interface ЗаписьРекорда {
  id: number;
  column_key: string;
  old_holder: number;
  old_nick: string;
  new_nick: string;
}

export const НАЗВАНИЕ_ИГРЫ: Record<string, string> = {
  best_ksuha_run: Т.игры.ksuha.название,
  best_match3: Т.игры.три_в_ряд.название,
  best_jira_level: Т.игры.jira.название,
  best_babka_crash: Т.игры.бабка.название,
};

export async function получитьНепрочитанныеРекорды(telegramId: number): Promise<ЗаписьРекорда[]> {
  const { data, error } = await supabase
    .from("record_notices")
    .select("id, column_key, old_holder, old_nick, new_nick")
    .eq("old_holder", telegramId)
    .eq("seen", false)
    .order("id");
  if (error) throw error;
  return data ?? [];
}

export async function отметитьРекордыПросмотренными(ids: number[]) {
  if (!ids.length) return;
  const { error } = await supabase.from("record_notices").update({ seen: true }).in("id", ids);
  if (error) throw error;
}

export async function отправитьУведомленияОРекордах(telegramId: number) {
  const { data, error } = await supabase
    .from("record_notices")
    .select("id, column_key, old_holder, old_nick, new_nick")
    .eq("new_holder", telegramId)
    .eq("tg_sent", false);
  if (error) throw error;
  for (const запись of data ?? []) {
    const r = await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "record",
        to: запись.old_holder,
        name: запись.old_nick,
        game: НАЗВАНИЕ_ИГРЫ[запись.column_key] ?? "",
        by: запись.new_nick,
      }),
    });
    const j = await r.json().catch(() => ({ ok: false }));
    if (j.ok) {
      await supabase.from("record_notices").update({ tg_sent: true }).eq("id", запись.id);
    }
  }
}

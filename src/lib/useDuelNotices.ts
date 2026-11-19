import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";
import { useUser } from "../store/UserContext";
import { дуэлиДляПлашек, именаИгроков } from "../api/duels";
import { Т } from "../texts";
import { хаптикУведомление } from "./haptic";

export type ВидПлашки = "вызвали" | "победа" | "поражение" | "ничья" | "отказ" | "истёк";
export interface ПлашкаДуэли { ключ: string; вид: ВидПлашки; заголовок: string; текст: string }

const ХРАНИЛИЩЕ = "100hp_duel_notices_seen";
const прочитанные = (): string[] => { try { return JSON.parse(localStorage.getItem(ХРАНИЛИЩЕ) ?? "[]"); } catch { return []; } };
const запомнить = (ключ: string) => {
  try { localStorage.setItem(ХРАНИЛИЩЕ, JSON.stringify([...прочитанные(), ключ].slice(-200))); } catch {}
};

/**
 * Всплывающие плашки о дуэлях: нас вызвали / мы выиграли, проиграли или была ничья / вызов отклонили или он истёк.
 * Приходят в реальном времени (Realtime по таблице duels), а при заходе в игру — всё, что случилось, пока игрока не было.
 * Своё действие (мы сами приняли дуэль) плашкой не дублируется — результат и так виден в окне дуэли.
 */
export function useDuelNotices() {
  const { telegramId } = useUser();
  const [очередь, setОчередь] = useState<ПлашкаДуэли[]>([]);
  const вОчереди = useRef(new Set<string>());

  const загрузить = useCallback(async () => {
    if (!telegramId) return;
    try {
      const список = await дуэлиДляПлашек(telegramId);
      const уже = new Set(прочитанные());
      const сейчас = Date.now();
      const имена = await именаИгроков(список.flatMap((д) => [д.challenger_id, д.target_id]));
      const ник = (id: number) => имена[id] ?? "Игрок";
      const новые: ПлашкаДуэли[] = [];
      const ТУ = Т.уведомленияДуэлей;

      for (const д of список) {
        const моя = д.challenger_id === telegramId;
        const соперник = ник(моя ? д.target_id : д.challenger_id);
        let ключ = "", вид: ВидПлашки | null = null, заголовок = "", текст = "";
        if (д.status === "pending" && !моя && new Date(д.expires_at).getTime() > сейчас) {
          ключ = `${д.id}:pending`; вид = "вызвали"; заголовок = ТУ.вызвали; текст = Т.уведомленияДуэлей.вызвалиТекст(соперник, д.bet);
        } else if (моя && д.status === "finished") {
          ключ = `${д.id}:finished`;
          if (д.winner_id === null) { вид = "ничья"; заголовок = ТУ.ничья; текст = ТУ.ничьяТекст(соперник); }
          else if (д.winner_id === telegramId) { вид = "победа"; заголовок = ТУ.победа; текст = ТУ.победаТекст(соперник, д.bet); }
          else { вид = "поражение"; заголовок = ТУ.поражение; текст = ТУ.поражениеТекст(соперник, д.bet); }
        } else if (моя && д.status === "declined") {
          ключ = `${д.id}:declined`; вид = "отказ"; заголовок = ТУ.отказ; текст = ТУ.отказТекст(соперник, д.bet);
        } else if (моя && д.status === "expired") {
          ключ = `${д.id}:expired`; вид = "истёк"; заголовок = ТУ.истёк; текст = ТУ.истёкТекст(соперник, д.bet);
        }
        if (!вид || уже.has(ключ) || вОчереди.current.has(ключ)) continue;
        вОчереди.current.add(ключ);
        новые.push({ ключ, вид, заголовок, текст });
      }
      if (новые.length) setОчередь((о) => [...о, ...новые.reverse()]); // старые первыми
    } catch { /* нет сети или нет таблицы — молчим, плашки не критичны */ }
  }, [telegramId]);

  useEffect(() => {
    if (!telegramId) return;
    загрузить();
    let t: ReturnType<typeof setTimeout>;
    const отложенно = () => { clearTimeout(t); t = setTimeout(загрузить, 400); };
    const ch = supabase
      .channel("duel-notices-" + telegramId)
      .on("postgres_changes", { event: "*", schema: "public", table: "duels" }, отложенно)
      .subscribe();
    const приПоказе = () => { if (document.visibilityState === "visible") загрузить(); };
    document.addEventListener("visibilitychange", приПоказе);
    return () => { clearTimeout(t); supabase.removeChannel(ch); document.removeEventListener("visibilitychange", приПоказе); };
  }, [telegramId, загрузить]);

  const текущая = очередь[0] ?? null;
  useEffect(() => {
    if (!текущая) return;
    запомнить(текущая.ключ);
    хаптикУведомление(текущая.вид === "победа" ? "success" : текущая.вид === "поражение" ? "error" : "warning");
  }, [текущая?.ключ]);

  const закрыть = useCallback(() => setОчередь((о) => о.slice(1)), []);
  return { текущая, осталосьЕщё: Math.max(0, очередь.length - 1), закрыть };
}

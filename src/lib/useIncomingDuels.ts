import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { useUser } from "../store/UserContext";
import { моиДуэли, обработатьПросроченные } from "../api/duels";

/** Сколько вызовов на дуэль ждут ответа текущего игрока. */
export function useIncomingDuels(): number {
  const { telegramId } = useUser();
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!telegramId) return;
    const загрузить = async () => {
      try {
        await обработатьПросроченные();
        const список = await моиДуэли(telegramId);
        const сейчас = Date.now();
        setN(список.filter((д) => д.target_id === telegramId && new Date(д.expires_at).getTime() > сейчас).length);
      } catch {}
    };
    загрузить();
    const ch = supabase
      .channel("duels-badge-" + telegramId)
      .on("postgres_changes", { event: "*", schema: "public", table: "duels" }, загрузить)
      .subscribe();
    const приПоказе = () => { if (document.visibilityState === "visible") загрузить(); };
    document.addEventListener("visibilitychange", приПоказе);
    return () => { supabase.removeChannel(ch); document.removeEventListener("visibilitychange", приПоказе); };
  }, [telegramId]);

  return n;
}

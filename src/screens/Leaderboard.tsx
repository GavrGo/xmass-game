import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useUser } from "../store/UserContext";
import { supabase } from "../lib/supabase";
import { getLeaderboard, getPlaceByHearts, СтрокаЛидерборда } from "../api/users";
import { ЛИДЕРБОРД } from "../config";

const медаль = (м: number) => (м === 1 ? "🥇" : м === 2 ? "🥈" : м === 3 ? "🥉" : String(м));

export default function Leaderboard() {
  const { user, telegramId } = useUser();
  const [строки, setСтроки] = useState<СтрокаЛидерборда[]>([]);
  const [моёМесто, setМоёМесто] = useState<number | null>(null);
  const [ошибка, setОшибка] = useState("");
  const [загрузка, setЗагрузка] = useState(true);
  const таймер = useRef<ReturnType<typeof setTimeout>>();

  const загрузить = async () => {
    try {
      setСтроки(await getLeaderboard(ЛИДЕРБОРД.сколькоПоказывать));
      setОшибка("");
    } catch (e: any) {
      setОшибка("Не удалось загрузить: " + (e.message ?? ""));
    }
    setЗагрузка(false);
  };

  // Первая загрузка + «живое» обновление: любое изменение в таблице users перезагружает список
  useEffect(() => {
    загрузить();
    const ch = supabase
      .channel("leaderboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => {
        clearTimeout(таймер.current);
        таймер.current = setTimeout(загрузить, 400); // небольшая пауза, чтобы не дёргать базу на каждый чих
      })
      .subscribe();
    return () => { clearTimeout(таймер.current); supabase.removeChannel(ch); };
  }, []);

  // Место текущего игрока (пересчитываем при смене его хэпэшек и при изменениях в таблице)
  useEffect(() => {
    if (!user) return;
    getPlaceByHearts(user.hearts).then(setМоёМесто).catch(() => setМоёМесто(null));
  }, [user?.hearts, строки]);

  if (!user) return null;

  // Место с учётом равенства: одинаковые хэпэшки = одинаковое место
  const места = строки.map((с) => строки.findIndex((x) => x.hearts === с.hearts) + 1);

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-bold">🏆 Лидерборд</h2>
        <Link to="/" className="rounded-xl bg-white/10 px-3 py-2 text-sm font-bold">← Назад</Link>
      </div>

      {/* Моё место */}
      <div className="mb-4 flex items-center gap-3 rounded-2xl bg-xmas-green/40 p-3 ring-1 ring-xmas-gold/60">
        <div className="w-12 text-center text-2xl font-bold">{моёМесто ? `#${моёМесто}` : "…"}</div>
        <div className="text-3xl">{user.emoji}</div>
        <div className="flex-1">
          <div className="font-bold">{user.nickname} (вы)</div>
          <div className="text-xs text-white/60">Ваше место по хэпэшкам</div>
        </div>
        <div className="text-lg font-bold">{user.hearts} ❤️</div>
      </div>

      {ошибка && <p className="mb-2 text-sm text-red-400">{ошибка}</p>}
      {загрузка && <p className="text-center text-white/50">Загрузка…</p>}

      <div className="flex flex-col gap-2">
        {строки.map((с, i) => {
          const я = с.telegram_id === telegramId;
          return (
            <div key={с.telegram_id} className={`flex items-center gap-3 rounded-2xl p-3 ${я ? "bg-xmas-gold/20 ring-1 ring-xmas-gold" : "bg-white/10"}`}>
              <div className="w-10 text-center text-lg font-bold">{медаль(места[i])}</div>
              <div className="text-2xl">{с.emoji}</div>
              <div className="min-w-0 flex-1 truncate font-bold">{с.nickname}</div>
              <div className="font-bold">{с.hearts} ❤️</div>
            </div>
          );
        })}
        {!загрузка && строки.length === 0 && <p className="text-center text-white/50">Пока никого нет</p>}
      </div>
    </div>
  );
}

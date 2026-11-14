import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useUser } from "../store/UserContext";
import { supabase } from "../lib/supabase";
import { getLeaderboard, getPlaceByHearts, СтрокаЛидерборда } from "../api/users";
import { ЛИДЕРБОРД, АССЕТЫ } from "../config";
import { Иконка, Картинка } from "../components/Иконка";
import { коротко } from "../lib/format";
import { Т } from "../texts";

const метка = (м: number) => (м === 1 ? "🥇" : м === 2 ? "🥈" : м === 3 ? "🥉" : String(м));

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
      setОшибка(Т.лидерборд.ошибкаЗагрузки(e.message ?? ""));
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
    <div className="px-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-bold">{Т.лидерборд.заголовок}</h2>
        <Link to="/" className="pill px-3 py-2 text-sm font-bold">{Т.лидерборд.назад}</Link>
      </div>

      {/* Ваша карточка */}
      <div className="card mb-4 flex flex-col items-center p-4">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-surface2 text-5xl">
          <Картинка путь={АССЕТЫ.папки.персонажи + АССЕТЫ.персонажи.лидерборд} fallback={<span>{user.emoji}</span>} className="h-full w-full object-cover" />
        </div>
        <div className="mt-2 text-lg font-bold">{Т.лидерборд.выИмя(user.nickname)}</div>
        <div className="mt-1 flex items-center gap-3 text-sm text-muted">
          <span>{Т.лидерборд.вашеМесто}:</span>
          <b className="text-brand-yellow">{моёМесто ? `#${моёМесто}` : "…"}</b>
          <span className="flex items-center gap-1 font-bold text-white"><Иконка имя="хэпэшки" размер={16} />{коротко(user.hearts)}</span>
        </div>
      </div>

      {ошибка && <p className="mb-2 text-sm text-red-400">{ошибка}</p>}
      {загрузка && <p className="text-center text-muted">{Т.лидерборд.загрузка}</p>}

      {/* Таблица */}
      <div className="mb-1 flex items-center px-3 text-[11px] font-semibold uppercase text-muted">
        <span className="w-10 text-center">{Т.лидерборд.колонкаМесто}</span>
        <span className="flex-1 pl-2">{Т.лидерборд.колонкаУчастники}</span>
        <span>{Т.лидерборд.колонкаОчки}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {строки.map((с, i) => {
          const я = с.telegram_id === telegramId;
          return (
            <div key={с.telegram_id} className={`flex items-center gap-2 rounded-2xl px-3 py-2.5 ${я ? "bg-brand-blue/20 ring-1 ring-brand-blue" : "bg-surface"}`}>
              <div className="w-10 text-center text-base font-bold">{метка(места[i])}</div>
              <div className="text-2xl">{с.emoji}</div>
              <div className="min-w-0 flex-1 truncate font-bold">{с.nickname}</div>
              <div className="flex items-center gap-1 font-bold"><Иконка имя="хэпэшки" размер={16} />{коротко(с.hearts)}</div>
            </div>
          );
        })}
        {!загрузка && строки.length === 0 && <p className="text-center text-muted">{Т.лидерборд.пусто}</p>}
      </div>
    </div>
  );
}

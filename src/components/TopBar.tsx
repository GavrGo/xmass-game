import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useUser } from "../store/UserContext";
import { Т } from "../texts";
import { Иконка } from "./Icon";
import { звук } from "../lib/sound";

export default function ВерхняяПанель({ скрытьЛидерборд = false }: { скрытьЛидерборд?: boolean }) {
  const { user, isAdmin } = useUser();
  const [музыка, setМузыка] = useState(звук.музыкаВкл);
  const [вибрация, setВибрация] = useState(звук.вибрацияВкл);
  useEffect(() => звук.подписаться(() => {
    setМузыка(звук.музыкаВкл);
    setВибрация(звук.вибрацияВкл);
  }), []);
  if (!user) return null;

  return (
    <div className="flex items-center gap-2 px-4 pb-2 pt-2">
      <div className="pill flex min-w-0 items-center gap-2 px-3 py-1.5">
        <span className="text-xl leading-none">{user.emoji}</span>
        <span className="max-w-[110px] truncate text-sm font-bold">{user.nickname}</span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <button onClick={() => звук.переключитьВибрацию()} aria-label="Вибрация" className="pill flex h-9 w-9 items-center justify-center">
          <img src="/assets/icons/vibration-on.svg" alt="" className={`h-5 w-5 ${вибрация ? "" : "opacity-35"}`} />
        </button>
        <button onClick={() => звук.переключитьМузыку()} aria-label={Т.панель.звук} className="pill flex h-9 w-9 items-center justify-center">
          <Иконка имя="звукВкл" размер={18} className={музыка ? "" : "opacity-35"} />
        </button>
        {isAdmin && (
          <Link to="/admin" aria-label={Т.панель.админка} className="pill flex h-9 w-9 items-center justify-center">
            <Иконка имя="админка" размер={18} />
          </Link>
        )}
        {!скрытьЛидерборд && (
          <Link to="/leaderboard" className="pill px-3 py-2 text-sm font-bold text-brand-yellow">{Т.панель.лидерборд}</Link>
        )}
      </div>
    </div>
  );
}
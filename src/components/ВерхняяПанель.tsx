import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useUser } from "../store/UserContext";
import { Т } from "../texts";
import { Иконка } from "./Иконка";
import { звук } from "../lib/sound";

// Верхняя панель всех основных экранов: игрок слева; звук, админка (для админов) и лидерборд справа.
export default function ВерхняяПанель() {
  const { user, isAdmin } = useUser();
  const [музыка, setМузыка] = useState(звук.музыкаВкл);
  useEffect(() => звук.подписаться(() => setМузыка(звук.музыкаВкл)), []);
  if (!user) return null;

  return (
    <div className="flex items-center gap-2 px-4 pb-2 pt-3">
      <div className="pill flex min-w-0 items-center gap-2 px-3 py-1.5">
        <span className="text-xl leading-none">{user.emoji}</span>
        <span className="max-w-[110px] truncate text-sm font-bold">{user.nickname}</span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <button onClick={() => звук.переключитьМузыку()} aria-label={Т.панель.звук} className="pill flex h-9 w-9 items-center justify-center">
          <Иконка имя={музыка ? "звукВкл" : "звукВыкл"} размер={18} />
        </button>
        {isAdmin && (
          <Link to="/admin" aria-label={Т.панель.админка} className="pill flex h-9 w-9 items-center justify-center">
            <Иконка имя="админка" размер={18} />
          </Link>
        )}
        <Link to="/leaderboard" className="pill px-3 py-2 text-sm font-bold text-brand-yellow">{Т.панель.лидерборд}</Link>
      </div>
    </div>
  );
}

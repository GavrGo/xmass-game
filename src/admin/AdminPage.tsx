import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useUser } from "../store/UserContext";
import { listUsers, updateUser, deleteUser } from "../api/users";
import type { User } from "../types";
import { Т } from "../texts";
import { загрузитьСтатистику } from "../lib/stats";
import type { СтрокаСтатистики } from "../lib/stats";
import { уровеньОпытаСлота } from "../game/slotXp";
import { уровеньМастерства } from "../game/mastery";

// Поля, которые админ может править (названия подписей — в src/texts.ts, раздел админка.поля)
const ПОЛЯ: (keyof User)[] = [
  "chips", "tickets", "hearts", "free_spin_level", "salary_level", "exchange_fee", "time_level", "trash_level",
  "best_ksuha_run", "puzzles_solved", "best_match3", "best_jira_level", "best_babka_crash",
];

type КлючСтат = Exclude<keyof СтрокаСтатистики, "telegram_id">;
const ТС = Т.админка.статистика;
const КОЛОНКИ_СТАТ = (Object.keys(ТС.колонки) as КлючСтат[]).map((k) => ({ k, t: ТС.колонки[k] }));
const времяТекст = (с: number) => `${Math.floor(с / 3600)}${ТС.часы} ${Math.floor((с % 3600) / 60)}${ТС.минуты}`;
const УРОВНИ = (Object.keys(ТС.уровни) as (keyof typeof ТС.уровни)[]).map((k) => ({ k, t: ТС.уровни[k] }));
function уровеньИгрока(u: User, k: string): number {
  if (k === "slot") return уровеньОпытаСлота(u.slot_spins ?? 0).уровень;
  return уровеньМастерства(u.mastery?.[k]?.xp ?? 0).уровень;
}

export default function AdminPage() {
  const { isAdmin } = useUser();
  const [игроки, setИгроки] = useState<User[]>([]);
  const [поиск, setПоиск] = useState("");
  const [загрузка, setЗагрузка] = useState(false);
  const [ошибка, setОшибка] = useState("");
  const [сообщение, setСообщение] = useState("");
  const [сохраняется, setСохраняется] = useState<number | null>(null);
  const [статистика, setСтатистика] = useState<СтрокаСтатистики[]>([]);

  const загрузить = async () => {
    setЗагрузка(true);
    setОшибка("");
    try {
      setИгроки(await listUsers());
      setСтатистика(await загрузитьСтатистику().catch(() => []));
    } catch (e: any) {
      setОшибка(Т.админка.ошибкиЗагрузки(e.message ?? ""));
    }
    setЗагрузка(false);
  };

  // Игроков грузим только когда точно известно, что пользователь — админ
  useEffect(() => {
    if (isAdmin) загрузить();
  }, [isAdmin]);

  // Поиск по нику (и по telegram_id)
  const найденные = useMemo(() => {
    const q = поиск.trim().toLowerCase();
    if (!q) return игроки;
    return игроки.filter(
      (u) => u.nickname.toLowerCase().includes(q) || String(u.telegram_id).includes(q)
    );
  }, [игроки, поиск]);

  // --- Защита доступа ---
  if (isAdmin === null) return <div className="p-6 text-center">{Т.админка.проверкаДоступа}</div>;
  if (!isAdmin) return <Navigate to="/" replace />; // не админ — на главную

  const изменитьЛокально = (id: number, ключ: keyof User, значение: number) =>
    setИгроки((л) => л.map((u) => (u.telegram_id === id ? { ...u, [ключ]: значение } : u)));

  const сохранить = async (u: User) => {
    setСохраняется(u.telegram_id);
    setОшибка("");
    try {
      // Только целые числа, не меньше нуля
      const patch: Partial<User> = {};
      // Пропускаем поля, которых нет у игрока (например, если колонка ещё не создана в базе)
      ПОЛЯ.forEach((п) => {
        if (u[п] === undefined) return;
        (patch as any)[п] = Math.max(0, Math.floor(Number(u[п]) || 0));
      });
      const сохранён = await updateUser(u.telegram_id, patch);
      setИгроки((л) => л.map((x) => (x.telegram_id === u.telegram_id ? сохранён : x)));
      setСообщение(Т.админка.сохранён(u.nickname));
    } catch (e: any) {
      setОшибка(Т.админка.ошибкаСохранения(e.message ?? ""));
    }
    setСохраняется(null);
  };

  const удалить = async (u: User) => {
    if (!confirm(Т.админка.подтверждениеУдаления(u.nickname))) return;
    try {
      await deleteUser(u.telegram_id);
      setИгроки((л) => л.filter((x) => x.telegram_id !== u.telegram_id));
      setСообщение(Т.админка.удалён(u.nickname));
    } catch (e: any) {
      setОшибка(Т.админка.ошибкаУдаления(e.message ?? ""));
    }
  };

  return (
    <div className="p-4 pb-16">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{Т.админка.заголовок}</h1>
        <Link to="/" className="btn btn-ghost !px-3 !py-2 text-sm">{Т.админка.вИгру}</Link>
      </div>

      <div className="mb-3 flex gap-2">
        <input
          value={поиск}
          onChange={(e) => setПоиск(e.target.value)}
          placeholder={Т.админка.поиск}
          className="w-full rounded-xl bg-surface px-4 py-2 outline-none focus:ring-2 focus:ring-brand-blue"
        />
        <button onClick={загрузить} className="btn btn-ghost !px-3">↻</button>
      </div>

      <p className="mb-3 text-sm text-white/60">
        {Т.админка.показано(найденные.length, игроки.length)}
        {загрузка && Т.админка.загрузка}
      </p>
      {сообщение && <p className="mb-2 text-sm text-brand-yellow">{сообщение}</p>}
      {ошибка && <p className="mb-2 text-sm text-red-400">{ошибка}</p>}

      <details className="card mb-3 p-3">
        <summary className="cursor-pointer font-bold">{ТС.заголовок}</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full whitespace-nowrap text-left text-xs">
            <thead className="text-white/50">
              <tr>
                <th className="pr-3 pb-2">{ТС.игрок}</th>
                {КОЛОНКИ_СТАТ.map((c) => <th key={c.k} className="px-2 pb-2 text-right">{c.t}</th>)}
                {УРОВНИ.map((c) => <th key={c.k} className="px-2 pb-2 text-right">{c.t}</th>)}
              </tr>
            </thead>
            <tbody>
              {[...игроки]
                .map((u) => ({ u, s: статистика.find((x) => x.telegram_id === u.telegram_id) }))
                .sort((a, b) => (b.s?.seconds_in_game ?? 0) - (a.s?.seconds_in_game ?? 0))
                .map(({ u, s }) => (
                  <tr key={u.telegram_id} className="border-t border-white/10">
                    <td className="py-1.5 pr-3 font-bold">{u.emoji} {u.nickname}</td>
                    {КОЛОНКИ_СТАТ.map((c) => (
                      <td key={c.k} className="px-2 text-right">{c.k === "seconds_in_game" ? времяТекст(s?.[c.k] ?? 0) : s?.[c.k] ?? 0}</td>
                    ))}
                    {УРОВНИ.map((c) => <td key={c.k} className="px-2 text-right">{уровеньИгрока(u, c.k)}</td>)}
                  </tr>
                ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/30 font-bold text-brand-yellow">
                <td className="pt-2 pr-3">{ТС.всего}</td>
                {КОЛОНКИ_СТАТ.map((c) => {
                  const сумма = статистика.reduce((a, x) => a + (x[c.k] ?? 0), 0);
                  return <td key={c.k} className="px-2 pt-2 text-right">{c.k === "seconds_in_game" ? времяТекст(сумма) : сумма}</td>;
                })}
                {УРОВНИ.map((c) => <td key={c.k} />)}
              </tr>
            </tfoot>
          </table>
        </div>
      </details>

      <div className="flex flex-col gap-3">
        {найденные.map((u) => (
          <div key={u.telegram_id} className="card p-3">
            <div className="mb-2 font-bold">
              {u.emoji} {u.nickname}{" "}
              <span className="text-xs font-normal text-white/50">id {u.telegram_id}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ПОЛЯ.filter((п) => u[п] !== undefined).map((п) => (
                <label key={п} className="text-xs text-white/60">
                  {Т.админка.поля[п]}
                  <input
                    type="number"
                    min={0}
                    value={u[п] as number}
                    onChange={(e) => изменитьЛокально(u.telegram_id, п, Number(e.target.value))}
                    className="mt-1 w-full rounded-lg bg-surface2 px-2 py-1 text-white"
                  />
                </label>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => сохранить(u)} disabled={сохраняется === u.telegram_id} className="btn btn-blue !px-4 !py-2 text-sm">
                {сохраняется === u.telegram_id ? Т.админка.сохраняем : Т.админка.сохранить}
              </button>
              <button onClick={() => удалить(u)} className="btn btn-red !px-4 !py-2 text-sm">{Т.админка.удалить}</button>
            </div>
          </div>
        ))}
        {!загрузка && найденные.length === 0 && <p className="text-center text-white/50">{Т.админка.никогоНеНашли}</p>}
      </div>
    </div>
  );
}

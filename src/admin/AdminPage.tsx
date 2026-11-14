import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useUser } from "../store/UserContext";
import { listUsers, updateUser, deleteUser } from "../api/users";
import type { User } from "../types";

// Поля, которые админ может править (название колонки в базе → подпись)
const ПОЛЯ: { ключ: keyof User; название: string }[] = [
  { ключ: "chips", название: "Фишки" },
  { ключ: "tickets", название: "Билеты" },
  { ключ: "hearts", название: "Хэпэшки" },
  { ключ: "free_spin_level", название: "Free Spin (ур.)" },
  { ключ: "salary_level", название: "Повышение ЗП (ур.)" },
  { ключ: "exchange_level", название: "Договоримся (ур.)" },
  { ключ: "time_level", название: "Сдвинуть сроки (ур.)" },
  { ключ: "best_ksuha_run", название: "Рекорд Ksuha Run" },
  { ключ: "puzzles_solved", название: "Собрано пазлов" },
  { ключ: "best_match3", название: "Рекорд 3 в ряд (этап)" },
  { ключ: "best_jira_level", название: "Рекорд Jira Fight" },
  { ключ: "best_babka_crash", название: "Рекорд Babka Crash" },
];

export default function AdminPage() {
  const { isAdmin } = useUser();
  const [игроки, setИгроки] = useState<User[]>([]);
  const [поиск, setПоиск] = useState("");
  const [загрузка, setЗагрузка] = useState(false);
  const [ошибка, setОшибка] = useState("");
  const [сообщение, setСообщение] = useState("");
  const [сохраняется, setСохраняется] = useState<number | null>(null);

  const загрузить = async () => {
    setЗагрузка(true);
    setОшибка("");
    try {
      setИгроки(await listUsers());
    } catch (e: any) {
      setОшибка("Не удалось загрузить игроков: " + (e.message ?? ""));
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
  if (isAdmin === null) return <div className="p-6 text-center">Проверка доступа…</div>;
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
        if (u[п.ключ] === undefined) return;
        (patch as any)[п.ключ] = Math.max(0, Math.floor(Number(u[п.ключ]) || 0));
      });
      const сохранён = await updateUser(u.telegram_id, patch);
      setИгроки((л) => л.map((x) => (x.telegram_id === u.telegram_id ? сохранён : x)));
      setСообщение(`✅ Сохранено: ${u.nickname}`);
    } catch (e: any) {
      setОшибка("Не удалось сохранить: " + (e.message ?? ""));
    }
    setСохраняется(null);
  };

  const удалить = async (u: User) => {
    if (!confirm(`Удалить игрока ${u.nickname}? Это нельзя отменить.`)) return;
    try {
      await deleteUser(u.telegram_id);
      setИгроки((л) => л.filter((x) => x.telegram_id !== u.telegram_id));
      setСообщение(`🗑 Удалён: ${u.nickname}`);
    } catch (e: any) {
      setОшибка("Не удалось удалить: " + (e.message ?? ""));
    }
  };

  return (
    <div className="p-4 pb-16">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Админ-панель</h1>
        <Link to="/" className="rounded-xl bg-white/10 px-3 py-2 text-sm font-bold">← В игру</Link>
      </div>

      <div className="mb-3 flex gap-2">
        <input
          value={поиск}
          onChange={(e) => setПоиск(e.target.value)}
          placeholder="Поиск по нику или id"
          className="w-full rounded-xl bg-white/10 px-4 py-2 outline-none focus:ring-2 focus:ring-xmas-gold"
        />
        <button onClick={загрузить} className="rounded-xl bg-white/10 px-3 font-bold">↻</button>
      </div>

      <p className="mb-3 text-sm text-white/60">
        Показано: {найденные.length} из {игроки.length}
        {загрузка && " · загрузка…"}
      </p>
      {сообщение && <p className="mb-2 text-sm text-xmas-gold">{сообщение}</p>}
      {ошибка && <p className="mb-2 text-sm text-red-400">{ошибка}</p>}

      <div className="flex flex-col gap-3">
        {найденные.map((u) => (
          <div key={u.telegram_id} className="rounded-2xl bg-white/10 p-3">
            <div className="mb-2 font-bold">
              {u.emoji} {u.nickname}{" "}
              <span className="text-xs font-normal text-white/50">id {u.telegram_id}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ПОЛЯ.map((п) => (
                <label key={п.ключ} className="text-xs text-white/60">
                  {п.название}
                  <input
                    type="number"
                    min={0}
                    value={u[п.ключ] as number}
                    onChange={(e) => изменитьЛокально(u.telegram_id, п.ключ, Number(e.target.value))}
                    className="mt-1 w-full rounded-lg bg-black/40 px-2 py-1 text-white"
                  />
                </label>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => сохранить(u)}
                disabled={сохраняется === u.telegram_id}
                className="rounded-lg bg-xmas-green px-4 py-2 text-sm font-bold disabled:bg-gray-600"
              >
                {сохраняется === u.telegram_id ? "Сохраняем…" : "Сохранить"}
              </button>
              <button onClick={() => удалить(u)} className="rounded-lg bg-xmas-red px-4 py-2 text-sm font-bold">
                Удалить
              </button>
            </div>
          </div>
        ))}
        {!загрузка && найденные.length === 0 && <p className="text-center text-white/50">Никого не нашли</p>}
      </div>
    </div>
  );
}

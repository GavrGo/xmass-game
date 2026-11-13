import { useEffect, useState } from "react";
import { useUser } from "../store/UserContext";
import { isAdmin, listUsers, updateUser, deleteUser } from "../api/users";
import type { User } from "../types";

// Поля, которые админ может править
const ПОЛЯ: { ключ: keyof User; название: string }[] = [
  { ключ: "chips", название: "Фишки" },
  { ключ: "tickets", название: "Билеты" },
  { ключ: "hearts", название: "Хэпэшки" },
  { ключ: "free_spin_level", название: "Бесп. крутка" },
  { ключ: "salary_level", название: "Зарплата" },
  { ключ: "exchange_level", название: "Обменник" },
  { ключ: "time_level", название: "Время" },
];

export default function AdminPage() {
  const { telegramId } = useUser();
  const [доступ, setДоступ] = useState<boolean | null>(null);
  const [игроки, setИгроки] = useState<User[]>([]);
  const [сообщение, setСообщение] = useState("");

  // 1. Проверяем, что id есть в таблице admins
  useEffect(() => {
    if (!telegramId) { setДоступ(false); return; }
    isAdmin(telegramId).then(setДоступ).catch(() => setДоступ(false));
  }, [telegramId]);

  // 2. Только для админа грузим игроков
  useEffect(() => {
    if (доступ) listUsers().then(setИгроки);
  }, [доступ]);

  if (доступ === null) return <div className="p-6">Проверка доступа…</div>;
  if (!доступ) return <div className="p-6 text-red-400">⛔ Доступ запрещён</div>;

  const изменитьЛокально = (id: number, ключ: keyof User, значение: number) =>
    setИгроки((л) => л.map((u) => (u.telegram_id === id ? { ...u, [ключ]: значение } : u)));

  const сохранить = async (u: User) => {
    const patch: Partial<User> = {};
    ПОЛЯ.forEach((п) => ((patch as any)[п.ключ] = Number(u[п.ключ])));
    await updateUser(u.telegram_id, patch);
    setСообщение(`Сохранено: ${u.nickname}`);
  };

  const удалить = async (u: User) => {
    if (!confirm(`Удалить игрока ${u.nickname}?`)) return;
    await deleteUser(u.telegram_id);
    setИгроки((л) => л.filter((x) => x.telegram_id !== u.telegram_id));
  };

  return (
    <div className="p-4">
      <h1 className="mb-1 text-2xl font-bold">Админ-панель</h1>
      <p className="mb-4 text-sm text-white/60">Игроков: {игроки.length} {сообщение && `· ${сообщение}`}</p>

      <div className="flex flex-col gap-3">
        {игроки.map((u) => (
          <div key={u.telegram_id} className="rounded-2xl bg-white/10 p-3">
            <div className="mb-2 font-bold">
              {u.emoji} {u.nickname} <span className="text-xs font-normal text-white/50">id {u.telegram_id}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ПОЛЯ.map((п) => (
                <label key={п.ключ} className="text-xs text-white/60">
                  {п.название}
                  <input
                    type="number"
                    value={u[п.ключ] as number}
                    onChange={(e) => изменитьЛокально(u.telegram_id, п.ключ, Number(e.target.value))}
                    className="mt-1 w-full rounded-lg bg-black/40 px-2 py-1 text-white"
                  />
                </label>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => сохранить(u)} className="rounded-lg bg-xmas-green px-4 py-2 text-sm font-bold">Сохранить</button>
              <button onClick={() => удалить(u)} className="rounded-lg bg-xmas-red px-4 py-2 text-sm font-bold">Удалить</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

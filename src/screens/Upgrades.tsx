import { useState } from "react";
import { ПРОКАЧКИ, КлючПрокачки, ценаСледующегоУровня } from "../config";
import { КОЛОНКА_УРОВНЯ } from "../types";
import type { User } from "../types";
import { useUser } from "../store/UserContext";

export default function Upgrades() {
  const { user, change } = useUser();
  const [занят, setЗанят] = useState(false);
  const [ошибка, setОшибка] = useState("");
  if (!user) return null;

  const купить = async (ключ: КлючПрокачки) => {
    const колонка = КОЛОНКА_УРОВНЯ[ключ];
    const уровень = user[колонка];
    const цена = ценаСледующегоУровня(ключ, уровень);
    if (занят || уровень >= ПРОКАЧКИ[ключ].максУровень || user.chips < цена) return;
    setЗанят(true);
    setОшибка("");
    try {
      // Списываем фишки и повышаем уровень одним действием, сразу сохраняя в базу
      const новыйУровень: Partial<User> = {};
      (новыйУровень as any)[колонка] = уровень + 1;
      await change({ chips: -цена }, новыйУровень);
    } catch (e: any) {
      setОшибка(e.message);
    }
    setЗанят(false);
  };

  return (
    <div className="p-4">
      <h2 className="mb-1 text-xl font-bold">Прокачка</h2>
      <p className="mb-4 text-white/60">🪙 {user.chips}</p>
      {ошибка && <p className="mb-2 text-sm text-red-400">{ошибка}</p>}

      <div className="flex flex-col gap-3">
        {(Object.keys(ПРОКАЧКИ) as КлючПрокачки[]).map((ключ) => {
          const п = ПРОКАЧКИ[ключ];
          const ур = user[КОЛОНКА_УРОВНЯ[ключ]];
          const макс = ур >= п.максУровень;
          const цена = ценаСледующегоУровня(ключ, ур);
          const хватает = user.chips >= цена;
          return (
            <div key={ключ} className="rounded-2xl bg-white/10 p-4">
              <div className="flex justify-between font-bold">
                <span>{п.название}</span>
                <span>ур. {ур}/{п.максУровень}</span>
              </div>
              <p className="text-sm text-white/60">{п.описание}</p>
              <p className="mt-1 text-sm text-xmas-gold">
                Сейчас: {п.знак}{ур * п.эффектЗаУровень}{п.единица}
                {!макс && ` → ${п.знак}${(ур + 1) * п.эффектЗаУровень}${п.единица}`}
              </p>
              <button
                disabled={макс || занят || !хватает}
                onClick={() => купить(ключ)}
                className="mt-2 w-full rounded-xl bg-xmas-green py-2 font-bold disabled:bg-gray-600 disabled:text-white/40"
              >
                {макс ? "Максимальный уровень" : `Улучшить за 🪙 ${цена}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

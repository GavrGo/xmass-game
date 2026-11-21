import { useMemo } from "react";
import type { User } from "../types";
import type { СтрокаСтатистики } from "../lib/stats";

type Метрика = { k: keyof СтрокаСтатистики | "chips"; t: string; время?: boolean };

const МЕТРИКИ: Метрика[] = [
  { k: "wheel_x100", t: "x100 на колесе" },
  { k: "wheel_x10", t: "x10 на колесе" },
  { k: "wheel_x5", t: "x5 на колесе" },
  { k: "wheel_x3", t: "x3 на колесе" },
  { k: "wheel_wins", t: "Выигрыши на колесе" },
  { k: "wheel_losses", t: "Проигрыши на колесе" },
  { k: "max_wheel_win_bet", t: "Макс. ставка с выигрышем (фишки)" },
  { k: "max_wheel_loss_bet", t: "Макс. ставка с проигрышем (фишки)" },
  { k: "wheel_spins", t: "Спины колеса" },
  { k: "slot_spins", t: "Спины слота" },
  { k: "slot_bombs", t: "Взрывы в слоте" },
  { k: "seconds_in_game", t: "Время в игре", время: true },
  { k: "chips", t: "Фишки сейчас" },
];

const СЧЁТЧИКИ = МЕТРИКИ.filter((м) => !м.время && !м.k.toString().startsWith("max_") && м.k !== "chips");

const число = (n: number) => n.toLocaleString("ru-RU");
const часы = (сек: number) => `${Math.floor(сек / 3600)} ч ${Math.floor((сек % 3600) / 60)} м`;

export default function СтатистикаАдмина({ игроки, статистика }: { игроки: User[]; статистика: СтрокаСтатистики[] }) {
  const строки = useMemo(
    () => игроки.map((u) => ({ u, s: статистика.find((x) => x.telegram_id === u.telegram_id) })),
    [игроки, статистика]
  );

  const значение = (r: { u: User; s?: СтрокаСтатистики }, м: Метрика): number =>
    м.k === "chips" ? r.u.chips : Number(r.s?.[м.k as keyof СтрокаСтатистики] ?? 0);
  const всего = (м: Метрика) => строки.reduce((a, r) => a + значение(r, м), 0);
  const топ = (м: Метрика) =>
    строки
      .map((r) => ({ r, v: значение(r, м) }))
      .filter((x) => x.v > 0)
      .sort((a, b) => b.v - a.v)
      .slice(0, 5);
  const форм = (м: Метрика, v: number) => (м.время ? часы(v) : число(v));
  const максСчётчик = Math.max(1, ...СЧЁТЧИКИ.map(всего));

  return (
    <div className="flex flex-col gap-4">
      <div className="card p-4">
        <div className="mb-3 font-bold">Сводка по всем игрокам ({строки.length})</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {МЕТРИКИ.map((м) => (
            <div key={м.k} className="rounded-xl bg-black/30 p-3">
              <div className="text-xs text-white/50">{м.t}</div>
              <div className="text-xl font-extrabold">{форм(м, всего(м))}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <div className="mb-3 font-bold">Счётчики событий</div>
        <div className="flex flex-col gap-2">
          {СЧЁТЧИКИ.map((м) => (
            <div key={м.k} className="flex items-center gap-2 text-sm">
              <div className="w-44 shrink-0 text-white/70">{м.t}</div>
              <div className="h-4 flex-1 rounded bg-white/10">
                <div className="h-4 rounded bg-brand-yellow" style={{ width: `${(всего(м) / максСчётчик) * 100}%` }} />
              </div>
              <div className="w-20 text-right font-bold">{число(всего(м))}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {МЕТРИКИ.map((м) => {
          const список = топ(м);
          const макс = список[0]?.v ?? 1;
          return (
            <div key={м.k} className="card p-4">
              <div className="mb-2 font-bold">Топ: {м.t}</div>
              {список.length === 0 ? (
                <div className="text-sm text-white/50">Пока нет данных</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {список.map((x, i) => (
                    <div key={x.r.u.telegram_id} className="text-sm">
                      <div className="mb-1 flex justify-between">
                        <span>
                          {i + 1}. {x.r.u.emoji} {x.r.u.nickname}
                        </span>
                        <span className="font-bold">{форм(м, x.v)}</span>
                      </div>
                      <div className="h-2 rounded bg-white/10">
                        <div className="h-2 rounded bg-brand-blue" style={{ width: `${(x.v / макс) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

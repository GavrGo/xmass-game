import { useMemo, useState } from "react";
import { useUser } from "../store/UserContext";
import type { Изменение } from "../store/UserContext";
import { КОЛЕСО, ВалютаКолеса } from "../config";
import { Т } from "../texts";
import { стат } from "../lib/stats";
import { Иконка } from "./Icon";
import { естьФайл, useАссеты } from "../lib/assets";
import Искры from "./Sparks";
import { звук } from "../lib/sound";
import { хаптик } from "../lib/haptic";
import { собратьСектора, выбратьСектор, новыйПоворот, выплата } from "../game/wheel";

const ВАЛЮТЫ: { ключ: ВалютаКолеса; иконка: "фишки" | "билеты" | "хэпэшки" }[] = [
  { ключ: "chips", иконка: "фишки" },
  { ключ: "tickets", иконка: "билеты" },
  { ключ: "hearts", иконка: "хэпэшки" },
];

const пауза = (мс: number) => new Promise<void>((r) => setTimeout(r, мс));

// Точка на окружности: угол в градусах по часовой стрелке от верхней точки
const точка = (угол: number, r: number) => {
  const a = (угол * Math.PI) / 180;
  return [100 + r * Math.sin(a), 100 - r * Math.cos(a)] as const;
};
const путьСектора = (от: number, до: number, r: number) => {
  const [x1, y1] = точка(от, r), [x2, y2] = точка(до, r);
  return `M100,100 L${x1},${y1} A${r},${r} 0 ${до - от > 180 ? 1 : 0} 1 ${x2},${y2} Z`;
};

// Время (0..1), когда колесо с easing cubic-bezier(0.12, 0.72, 0.1, 1) проходит долю пути y (0..1)
function временнаяТочкаПути(y: number): number {
  const bz = (a: number, b: number, u: number) => 3 * a * u * (1 - u) * (1 - u) + 3 * b * u * u * (1 - u) + u * u * u;
  let lo = 0, hi = 1;
  for (let k = 0; k < 24; k++) {
    const m = (lo + hi) / 2;
    if (bz(0.72, 1, m) < y) lo = m; else hi = m;
  }
  return bz(0.12, 0.1, (lo + hi) / 2);
}

type Результат = { вид: "выигрыш" | "частично" | "проигрыш"; текст: string };

// Колесо фортуны: попап поверх всего экрана.
export default function КолесоФортуны({ onЗакрыть }: { onЗакрыть: () => void }) {
  const { user, change } = useUser();
  useАссеты();
  const свойЧереп = естьФайл("assets/icons/wheel-skull.png") === true; // своя картинка черепа, если положили
  const [валюта, setВалюта] = useState<ВалютаКолеса>("chips");
  const [ставкаВвод, setСтавка] = useState<number>(КОЛЕСО.минСтавка);
  const [поворот, setПоворот] = useState(0);
  const [идёт, setИдёт] = useState(false);
  const [результат, setРезультат] = useState<Результат | null>(null);
  const [заморозка, setЗаморозка] = useState<{ chips: number; tickets: number; hearts: number } | null>(null);
  const [ошибка, setОшибка] = useState("");

  const секторы = useMemo(() => собратьСектора(валюта), [валюта]);
  if (!user) return null;

  const баланс = заморозка ?? { chips: user.chips, tickets: user.tickets, hearts: user.hearts };
  const доступно = Math.max(0, баланс[валюта]); // верхнего лимита нет — можно поставить весь баланс
  const границаСтавки = Math.max(КОЛЕСО.минСтавка, доступно);
  const ставка = Math.max(КОЛЕСО.минСтавка, Math.min(ставкаВвод, границаСтавки)); // ставка не больше доступного
  const ставкаОК = доступно >= КОЛЕСО.минСтавка && ставка >= КОЛЕСО.минСтавка && ставка <= доступно;
  const иконкаВалюты = ВАЛЮТЫ.find((в) => в.ключ === валюта)!.иконка;
  const ТК = Т.колесо;
  const [r, g, b] = КОЛЕСО.свечение[валюта].split(",");

  const зажать = (n: number) => Math.max(КОЛЕСО.минСтавка, Math.min(границаСтавки, Math.floor(n) || КОЛЕСО.минСтавка));
  const выбратьВалюту = (в: ВалютаКолеса) => {
    if (идёт) return;
    setВалюта(в);
    const макс = Math.max(КОЛЕСО.минСтавка, баланс[в]);
    setСтавка((с) => Math.max(КОЛЕСО.минСтавка, Math.min(макс, с)));
    setРезультат(null);
  };

  const крутить = async () => {
    if (идёт || !ставкаОК) return;
    setИдёт(true);
    setРезультат(null);
    setОшибка("");

    const индекс = выбратьСектор(секторы);
    const с = секторы[индекс];
    const получено = выплата(ставка, с.множитель);
    const итог = получено - ставка; // сколько меняется баланс (при черепе — минус ставка)

    // Показываем баланс «до результата», пока колесо крутится
    setЗаморозка({ chips: user.chips, tickets: user.tickets, hearts: user.hearts, [валюта]: баланс[валюта] - ставка });
    setПоворот((п) => новыйПоворот(п, с));
    звук.sfx("спин");
    стат("wheel_spins");
    хаптик("light");

    // Тики по границам секторов: часто в начале, реже к концу
    const всегоСекторов = КОЛЕСО.сектора.length;
    const длительность = КОЛЕСО.вращение.секунд * 1000;
    const оборотов = КОЛЕСО.вращение.оборотов;
    const всегоГраниц = Math.floor(оборотов * всегоСекторов);
    let последнийТик = -100;
    for (let i = 1; i <= всегоГраниц; i++) {
      const t = временнаяТочкаПути(i / всегоГраниц) * длительность;
      if (t - последнийТик < 38) continue;
      последнийТик = t;
      setTimeout(() => хаптик("light"), t);
    }

    try {
      const дельта: Изменение = {};
      дельта[валюта] = итог;
      await Promise.all([change(дельта), пауза(КОЛЕСО.вращение.секунд * 1000 + 250)]);
      if (с.множитель === 0) {
        setРезультат({ вид: "проигрыш", текст: ТК.проигрыш(ставка) });
        звук.sfx("поражение");
      } else if (с.множитель < 1) {
        setРезультат({ вид: "частично", текст: ТК.частично(с.множитель, получено) });
        звук.sfx("ошибка");
      } else {
        setРезультат({ вид: "выигрыш", текст: ТК.выигрыш(с.множитель, получено) });
        звук.sfx(с.множитель >= 3 ? "победа" : "бонус");
      }
    } catch (e: any) {
      setОшибка(ТК.ошибка(e.message));
      звук.sfx("ошибка");
    } finally {
      setЗаморозка(null);
      setИдёт(false);
    }
  };

  const размерКолеса = "min(76vw, 40vh, 340px)";

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center overflow-y-auto bg-black/90">
      {/* Свечение за колесом и искры для сердечек */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{ background: `radial-gradient(circle at 50% 30%, rgba(${r},${g},${b},0.55) 0%, rgba(${r},${g},${b},0.22) 32%, transparent 62%)` }}
      />
      {валюта === "hearts" && <Искры количество={КОЛЕСО.искрыСердечек} цвет={КОЛЕСО.свечение.hearts} />}

      {/* Крестик */}
      <button
        onClick={onЗакрыть}
        disabled={идёт}
        aria-label={Т.общее.закрыть}
        className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-lg text-white disabled:opacity-30"
      >
        {Т.общее.крестик}
      </button>

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center px-4 pb-6 pt-12">
        {/* Колесо с указателем */}
        <div className="relative" style={{ width: размерКолеса, height: размерКолеса }}>
          <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/3 drop-shadow-lg">
            <svg width="34" height="40" viewBox="0 0 34 40"><path d="M17 40 L2 6 Q17 -4 32 6 Z" fill="#FFD000" stroke="#7A5B00" strokeWidth="2" /></svg>
          </div>
          <div
            className="h-full w-full"
            style={{
              transform: `rotate(${поворот}deg)`,
              transition: идёт ? `transform ${КОЛЕСО.вращение.секунд}s cubic-bezier(0.12, 0.72, 0.1, 1)` : "none",
            }}
          >
            <svg viewBox="0 0 200 200" className="h-full w-full drop-shadow-2xl">
              <circle cx="100" cy="100" r="99" fill="#2A2B32" />
              {секторы.map((с, i) => {
                const середина = (с.от + с.до) / 2;
                const череп = с.множитель === 0;
                return (
                  <g key={i}>
                    <path d={путьСектора(с.от, с.до, 94)} fill={череп ? КОЛЕСО.цветЧерепа : КОЛЕСО.цветаСекторов[String(с.множитель)] ?? "#666"} stroke="#0F0F11" strokeWidth="1.2" />
                    <g transform={`rotate(${середина} 100 100)`}>
                      {череп ? (
                        свойЧереп ? (
                          <image href="/assets/icons/wheel-skull.png" x="86" y="16" width="28" height="28" />
                        ) : (
                          // Нарисованный череп (не зависит от шрифта эмодзи)
                          <g transform="translate(100 32)">
                            <path d="M-10,2 C-12,-12 12,-12 10,2 L10,6 C10,8 8,9 6,9 L6,12 L-6,12 L-6,9 C-8,9 -10,8 -10,6 Z" fill="#F4F4F5" />
                            <circle cx="-4" cy="0" r="2.8" fill="#1B1B22" />
                            <circle cx="4" cy="0" r="2.8" fill="#1B1B22" />
                            <path d="M0,3 L-1.5,6 L1.5,6 Z" fill="#1B1B22" />
                            <path d="M-3,9 V12 M0,9 V12 M3,9 V12" stroke="#1B1B22" strokeWidth="0.8" />
                          </g>
                        )
                      ) : (
                        <text x="100" y="40" textAnchor="middle" fontSize="15" fontWeight="800" fill="#fff" stroke="rgba(0,0,0,0.35)" strokeWidth="0.6">
                          {ТК.множитель(с.множитель)}
                        </text>
                      )}
                    </g>
                  </g>
                );
              })}
              <circle cx="100" cy="100" r="17" fill="#FFD000" stroke="#7A5B00" strokeWidth="3" />
              <circle cx="100" cy="100" r="6" fill="#7A5B00" />
            </svg>
          </div>
        </div>

        {/* Результат */}
        <div className="mt-3 h-8 text-center text-lg font-extrabold">
          {идёт ? <span className="text-white/60">{ТК.крутится}</span> : результат && (
            <span className={результат.вид === "выигрыш" ? "text-brand-yellow" : результат.вид === "частично" ? "text-white" : "text-red-300"}>{результат.текст}</span>
          )}
          {ошибка && <span className="text-red-300">{ошибка}</span>}
        </div>

        {/* Выбор валюты */}
        <p className="mt-2 text-lg font-bold">{ТК.наЧтоИграем}</p>
        <div className="mt-2 flex gap-3">
          {ВАЛЮТЫ.map((в) => (
            <button
              key={в.ключ}
              onClick={() => выбратьВалюту(в.ключ)}
              disabled={идёт}
              className={`flex h-[84px] w-[84px] flex-col items-center justify-center gap-1 rounded-2xl border-2 transition ${
                валюта === в.ключ ? "border-brand-yellow bg-white/15" : "border-white/10 bg-white/5"
              }`}
            >
              <Иконка имя={в.иконка} размер={34} />
              <span className="text-[11px] font-bold text-white/80">{баланс[в.ключ]}</span>
            </button>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-white/50">{ТК.валюты[валюта]}</p>

        {/* Ставка: −100 −10 −1 [поле] +1 +10 +100 */}
        <div className="mt-3 flex w-full items-center justify-center gap-1">
          {[["-100", -100], [ТК.минус10, -10], [ТК.минус1, -1]].map(([подпись, шаг]) => (
            <button key={подпись as string} disabled={идёт} onClick={() => setСтавка(зажать(ставка + (шаг as number)))} className="btn btn-ghost !rounded-lg !px-0 w-9 !py-2 text-xs">{подпись}</button>
          ))}
          <div className="flex h-12 w-24 items-center justify-center gap-1 rounded-xl border border-white/15 bg-black/40">
            <input
              type="number"
              inputMode="numeric"
              value={ставка}
              disabled={идёт}
              onChange={(e) => setСтавка(зажать(Number(e.target.value)))}
              aria-label={ТК.ставка}
              className="w-14 bg-transparent text-center text-xl font-extrabold text-white outline-none"
            />
            <Иконка имя={иконкаВалюты} размер={18} />
          </div>
          {[[ТК.плюс1, 1], [ТК.плюс10, 10], ["+100", 100]].map(([подпись, шаг]) => (
            <button key={подпись as string} disabled={идёт} onClick={() => setСтавка(зажать(ставка + (шаг as number)))} className="btn btn-ghost !rounded-lg !px-0 w-9 !py-2 text-xs">{подпись}</button>
          ))}
        </div>

        {/* Большая кнопка */}
        <button onClick={крутить} disabled={идёт || !ставкаОК} className="btn btn-yellow mt-4 flex w-full items-center justify-center gap-2 !py-4 text-lg">
          {ТК.кнопка(ставка)}
          <Иконка имя={иконкаВалюты} размер={22} />
        </button>
        {доступно < КОЛЕСО.минСтавка && <p className="mt-2 text-xs text-red-300">{ТК.нехватает}</p>}
      </div>
    </div>
  );
}

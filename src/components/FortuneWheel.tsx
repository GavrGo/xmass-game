import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "../store/UserContext";
import type { Изменение } from "../store/UserContext";
import { КОЛЕСО, ВалютаКолеса } from "../config";
import { Т } from "../texts";
import { стат } from "../lib/stats";
import { Иконка } from "./Icon";
import { useАссеты } from "../lib/assets";
import { естьАртефакт } from "../game/artifacts";
import { Колесо, ЛегендаКолеса, Череп } from "./WheelParts";
import type { Сектор } from "../game/wheel";
import Искры from "./Sparks";
import { звук } from "../lib/sound";
import { хаптик } from "../lib/haptic";
import { собратьСектора, выбратьСектор, новыйПоворот, выплата, уголДиска, границПройдено, секторПриУгле } from "../game/wheel";

const ВАЛЮТЫ: { ключ: ВалютаКолеса; иконка: "фишки" | "билеты" | "хэпэшки" }[] = [
  { ключ: "chips", иконка: "фишки" },
  { ключ: "tickets", иконка: "билеты" },
  { ключ: "hearts", иконка: "хэпэшки" },
];

const пауза = (мс: number) => new Promise<void>((r) => setTimeout(r, мс));

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

function цветСектора(с: Сектор): string {
  if (с.золотой) return "#FFC83A";
  if (с.множитель === 0) return КОЛЕСО.цветЧерепа;
  return КОЛЕСО.цветаСекторов[String(с.множитель)] ?? "#666";
}

function силаСвечения(м: number): number {
  if (м >= 100) return 1;
  if (м >= 10) return 0.8;
  if (м >= 5) return 0.6;
  if (м >= 3) return 0.4;
  return 0;
}

function ЧастицыКолеса() {
  const частицы = useMemo(() => Array.from({ length: 16 }, () => ({
    left: 6 + Math.random() * 88, size: 2 + Math.random() * 3, dur: 5 + Math.random() * 4, delay: -Math.random() * 9,
  })), []);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {частицы.map((p, i) => (
        <span key={i} className="wheel-rain" style={{ left: `${p.left}%`, width: p.size, height: p.size, ["--dur" as any]: `${p.dur}s`, ["--delay" as any]: `${p.delay}s` }} />
      ))}
    </div>
  );
}

type Результат = { вид: "выигрыш" | "частично" | "проигрыш"; текст: string };

// Колесо фортуны: попап поверх всего экрана.
export default function КолесоФортуны({ onЗакрыть }: { onЗакрыть: () => void }) {
  const { user, change } = useUser();
  useАссеты();
  const указатель = useRef<HTMLDivElement>(null);
  const дискRef = useRef<HTMLDivElement>(null);
  const живо = useRef(true);
  useEffect(() => () => { живо.current = false; }, []);
  const [валюта, setВалюта] = useState<ВалютаКолеса>("chips");
  const [ставкаВвод, setСтавка] = useState<number>(КОЛЕСО.минСтавка);
  const [поворот, setПоворот] = useState(0);
  const [идёт, setИдёт] = useState(false);
  const [подСтрелкой, setПодСтрелкой] = useState<Сектор | null>(null);
  const [результат, setРезультат] = useState<Результат | null>(null);
  const [заморозка, setЗаморозка] = useState<{ chips: number; tickets: number; hearts: number } | null>(null);
  const [ошибка, setОшибка] = useState("");
  const [сила, setСила] = useState(0);

  const сX10 = естьАртефакт(user, "x10");
  const секторы = useMemo(() => собратьСектора(валюта, сX10), [валюта, сX10]);
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

    setСила(0);
    const индекс = выбратьСектор(секторы);
    const с = секторы[индекс];
    const получено = выплата(ставка, с.множитель);
    const итог = получено - ставка; // сколько меняется баланс (при черепе — минус ставка)

    // Показываем баланс «до результата», пока колесо крутится
    setЗаморозка({ chips: user.chips, tickets: user.tickets, hearts: user.hearts, [валюта]: баланс[валюта] - ставка });
    const было = поворот;
    setПодСтрелкой(секторПриУгле(секторы, было));
    const стало = новыйПоворот(было, с);
    setПоворот(стало);
    звук.sfx("спин");
    стат("wheel_spins");
    хаптик("light");

    // Щелчки: читаем реальный угол диска каждый кадр; когда граница сектора проходит под указателем —
    // указатель отклоняется и дрожит телефон
    const диск = дискRef.current;
    if (диск) {
      const старт = performance.now();
      let A = уголДиска(диск) ?? 0;
      let последнийТик = -100;
      const кадр = () => {
        const угол = уголДиска(диск);
        if (угол !== null) {
          const прошлый = ((A % 360) + 360) % 360;
          let дельта = (угол - прошлый + 360) % 360;
          if (дельта > 340) дельта = 0; // дрожание округления, колесо назад не вращается
          const A1 = A + дельта;
          const t = performance.now() - старт;
          setПодСтрелкой(секторПриУгле(секторы, A1));
          if (границПройдено(секторы, A, A1) > 0 && t - последнийТик >= 45) {
            последнийТик = t;
            хаптик("light");
            указатель.current?.animate?.(
              [{ transform: "rotate(0deg)" }, { transform: "rotate(-30deg)", offset: 0.22 }, { transform: "rotate(0deg)" }],
              { duration: 240, easing: "ease-out" }
            );
          }
          A = A1;
        }
        if (живо.current && performance.now() - старт < КОЛЕСО.вращение.секунд * 1000 + 300) requestAnimationFrame(кадр);
      };
      requestAnimationFrame(кадр);
    }

    try {
      const дельта: Изменение = {};
      дельта[валюта] = итог;
      await Promise.all([change(дельта), пауза(КОЛЕСО.вращение.секунд * 1000 + 250)]);
      if (с.множитель === 0) {
        setСила(с.золотой ? 1 : силаСвечения(с.множитель));
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

  const размерКолеса = "min(96vw, max(240px, calc(100vh - 330px)), 440px)";
  const сейчасПодСтрелкой = идёт && подСтрелкой ? подСтрелкой : секторПриУгле(секторы, поворот);

  const хабТекст = сейчасПодСтрелкой.множитель === 0 ? <Череп размер={26} /> : Т.колесо.множитель(сейчасПодСтрелкой.множитель);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center overflow-y-auto bg-black/90">
      {/* Свечение за колесом и искры для сердечек */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{ background: `radial-gradient(circle at 50% 30%, rgba(${r},${g},${b},${0.55 + 0.4 * сила}) 0%, rgba(${r},${g},${b},${0.22 + 0.3 * сила}) 32%, transparent 62%)` }}
      />
      <ЧастицыКолеса />
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

      <div className="relative z-10 flex w-full max-w-md flex-col items-center px-4 pb-4 pt-3">

        {/* Колесо с указателем */}
        <div className="relative" style={{ width: размерКолеса, height: размерКолеса, filter: сила > 0 ? `drop-shadow(0 0 ${18 + 40 * сила}px rgba(${r},${g},${b},${0.35 + 0.5 * сила}))` : undefined }}>
          <Колесо хабЦвет={цветСектора(сейчасПодСтрелкой)} хабТекст={хабТекст} секторы={секторы} поворот={поворот} идёт={идёт} секунд={КОЛЕСО.вращение.секунд} указательRef={указатель} дискRef={дискRef} />
        </div>
        <ЛегендаКолеса x10={сX10} />

        {/* Результат */}
        <div className="mt-3 h-8 text-center text-lg font-extrabold">
          {идёт ? <span className="text-white/60">{ТК.крутится}</span> : результат && (
            <span key={результат.текст} className={`${результат.вид === "выигрыш" ? "text-brand-yellow" : результат.вид === "частично" ? "text-white" : "text-red-300"} ${сила > 0 ? "bj-pct" : ""}`}>{результат.текст}</span>
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

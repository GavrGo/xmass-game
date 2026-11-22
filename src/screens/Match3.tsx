import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Т } from "../texts";
import Эм from "../components/Emoji";
import { хаптик } from "../lib/haptic";
import { стат } from "../lib/stats";
import { звук } from "../lib/sound";
import { useNoSwipes } from "../lib/useNoSwipes";
import { useUser } from "../store/UserContext";
import { useMastery, сБонусом } from "../lib/useMastery";
import { ТРИ_В_РЯД as К } from "../config";
import { getGlobalRecord, Рекорд } from "../api/users";
import { глобальныйРекорд } from "../game/records";
import ВспышкиCanvas, { Вспышка } from "../components/FlashesCanvas";
import ПолосаОчков from "../components/MatchProgress";
import GameMenu from "../components/GameMenu";
import GameResult from "../components/GameResult";
import {
  КОЛ, СТР, Поле, соседи, поменять, найтиСерии, разрушения, упасть, естьХод, начальноеПоле, перемешатьПоле,
  очкиЗаШаг, цельЭтапа, ходовЭтапа, наградаЭтапа, ТЕКСТ_ЭФФЕКТА,
} from "../game/match3";

type Фаза = "menu" | "playing" | "stage" | "over";

interface ДанныеЭтапа {
  этап: number;
  награда: ReturnType<typeof наградаЭтапа>;
  сохранилось: boolean;
  предупреждение?: string;
  личный: number;
  глобальный: Рекорд | null | "ошибка" | undefined;
}
interface Итог {
  причина: "ходы" | "выход";
  пройдено: number;
  фишек: number;
  личный: number;
  глобальный: Рекорд | null | "ошибка" | undefined;
}

// Лёгкое покачивание иконки в покое (у каждой свой ритм)
const idle = (id: number) => ({
  animation: "idle-sway 3s ease-in-out infinite",
  animationDuration: `${(2.8 + (id % 5) * 0.25).toFixed(2)}s`,
  animationDelay: `-${((id * 0.37) % 3).toFixed(2)}s`,
});

const пауза = (мс: number) => new Promise<void>((r) => setTimeout(r, мс));
const кадр = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

export default function Match3() {
  const { user, change } = useUser();
  const { бонус, мастерство, начислить: начислитьМастерство } = useMastery("match3");
  const navigate = useNavigate();
  useNoSwipes(); // игра управляется только тапами

  const [фаза, setФаза] = useState<Фаза>("menu");
  const [поле, setПоле] = useState<Поле>([]);
  const [новые, setНовые] = useState<Set<number>>(new Set());
  const [удаляются, setУдаляются] = useState<Set<number>>(new Set());
  const [выбранная, setВыбранная] = useState<number | null>(null);
  const [этап, setЭтап] = useState(1);
  const [очки, setОчки] = useState(0);
  const [цель, setЦель] = useState(0);
  const [ходы, setХоды] = useState(0);
  const [тост, setТост] = useState("");
  const [вспышки, setВспышки] = useState<Вспышка[]>([]);
  const счётВспышек = useRef(0);
  const [фото, setФото] = useState<Record<string, boolean>>({});
  const [готово, setГотово] = useState(false);
  const [данныеЭтапа, setДанныеЭтапа] = useState<ДанныеЭтапа | null>(null);
  const [итог, setИтог] = useState<Итог | null>(null);
  const [импульс, setИмпульс] = useState(0);
  const [попап, setПопап] = useState<{ id: number; текст: string } | null>(null);
  const летRef = useRef<HTMLDivElement>(null);
  const полеWrapRef = useRef<HTMLDivElement>(null);
  const [полеВт, setПолеВт] = useState(0);
  useLayoutEffect(() => {
    const el = полеWrapRef.current;
    if (!el) return;
    const пересчитать = () => setПолеВт(Math.floor(Math.min(el.clientWidth, (el.clientHeight * КОЛ) / СТР)));
    пересчитать();
    const наблюдатель = new ResizeObserver(пересчитать);
    наблюдатель.observe(el);
    return () => наблюдатель.disconnect();
  }, []);
  const полосаRef = useRef<HTMLDivElement>(null);
  const визРef = useRef(0);
  const визТокен = useRef(0);
  const попапСчёт = useRef(0);

  const доскаRef = useRef<HTMLDivElement>(null);
  const полеRef = useRef<Поле>([]);
  const очкиRef = useRef(0);
  const ходыRef = useRef(0);
  const цельRef = useRef(0);
  const этапRef = useRef(1);
  const занято = useRef(false);
  const сессия = useRef({ пройдено: 0, фишек: 0 });
  const таймерТоста = useRef<ReturnType<typeof setTimeout>>();
  const свежее = useRef({ user, change });
  свежее.current = { user, change };

  // Проверяем, какие картинки из public/match3/ есть (для остальных рисуем эмодзи)
  useEffect(() => {
    let жив = true;
    Promise.all(
      К.символы.map(
        (с) =>
          new Promise<[string, boolean]>((ok) => {
            const img = new Image();
            img.onload = () => ok([с.id, true]);
            img.onerror = () => ok([с.id, false]);
            img.src = К.папка + с.файл;
          })
      )
    ).then((рез) => {
      if (!жив) return;
      setФото(Object.fromEntries(рез));
      setГотово(true);
    });
    return () => { жив = false; };
  }, []);

  const показатьТост = (текст: string) => {
    setТост(текст);
    clearTimeout(таймерТоста.current);
    таймерТоста.current = setTimeout(() => setТост(""), 1400);
  };

  /** Яркая вспышка в центре взрыва (4 в ряд). */
  const добавитьВспышку = (центр: number) => {
    const id = ++счётВспышек.current;
    const r = Math.floor(центр / КОЛ), c = центр % КОЛ;
    setВспышки((в) => [...в, { id, x: (c + 0.5) / КОЛ, y: (r + 0.5) / СТР, радиус: (К.радиусВзрыва + 1.4) / КОЛ, старт: performance.now() }]);
    setTimeout(() => setВспышки((в) => в.filter((x) => x.id !== id)), 700);
  };

  /** Новый этап (n = 1, 2, 3 ...). */
  const начатьЭтап = (n: number) => {
    этапRef.current = n; setЭтап(n);
    цельRef.current = цельЭтапа(n); setЦель(цельRef.current);
    ходыRef.current = ходовЭтапа(n); setХоды(ходыRef.current);
    очкиRef.current = 0; визРef.current = 0; визТокен.current++; setОчки(0);
    const п = начальноеПоле();
    полеRef.current = п; setПоле(п);
    setНовые(new Set()); setУдаляются(new Set()); setВыбранная(null);
    setДанныеЭтапа(null);
    setФаза("playing");
  };

  const старт = () => {
    стат("plays_match3");
    сессия.current = { пройдено: 0, фишек: 0 };
    setИтог(null);
    начатьЭтап(1);
  };

  const показатьПопап = (текст: string) => {
    const id = ++попапСчёт.current;
    setПопап({ id, текст });
    const вспышкаId = ++счётВспышек.current;
    setВспышки((в) => [...в, { id: вспышкаId, x: 0.5, y: 0.5, радиус: 0.9, старт: performance.now() }]);
    setTimeout(() => setВспышки((в) => в.filter((x) => x.id !== вспышкаId)), 700);
    setTimeout(() => setПопап((п) => (п?.id === id ? null : п)), 1700);
  };

  const прибавитьВизуально = (сумма: number) => {
    визРef.current += сумма;
    setОчки(Math.round(визРef.current));
    setИмпульс((н) => н + 1);
  };

  const улететь = (индексы: Set<number>, п: Поле, очкиБатча: number) => {
    const доска = доскаRef.current, слой = летRef.current, цель = полосаRef.current;
    const части = [...индексы].filter((i) => п[i]);
    const токен = визТокен.current;
    if (!доска || !слой || !цель || !части.length) {
      прибавитьВизуально(очкиБатча);
      return;
    }
    const р = доска.getBoundingClientRect(), ц = цель.getBoundingClientRect();
    const шагX = р.width / КОЛ, шагY = р.height / СТР;
    const заполнено = Math.min(1, визРef.current / цельRef.current);
    const tx = ц.left + ц.width * заполнено, ty = ц.top + ц.height / 2;
    const доляОчков = очкиБатча / части.length;
    части.forEach((i, n) => {
      const к = п[i]!;
      const сим = К.символы[к.тип];
      const размер = Math.min(шагX, шагY) * 0.7;
      const x0 = р.left + (i % КОЛ) * шагX + (шагX - размер) / 2;
      const y0 = р.top + Math.floor(i / КОЛ) * шагY + (шагY - размер) / 2;
      const el = document.createElement("div");
      el.style.cssText = `position:absolute;left:${x0}px;top:${y0}px;width:${размер}px;height:${размер}px;display:flex;align-items:center;justify-content:center;pointer-events:none;will-change:transform,opacity`;
      if (фото[сим.id]) {
        const img = document.createElement("img");
        img.src = К.папка + сим.файл;
        img.alt = "";
        img.draggable = false;
        img.style.cssText = "width:100%;height:100%;object-fit:contain";
        el.appendChild(img);
      } else {
        el.textContent = сим.эмодзи;
        el.style.fontSize = `${размер * 0.8}px`;
        el.style.lineHeight = "1";
      }
      слой.appendChild(el);
      const dx = tx - (x0 + размер / 2), dy = ty - (y0 + размер / 2);
      const подъём = -(60 + Math.random() * 50);
      const анимация = el.animate(
        [
          { transform: "translate(0px,0px) scale(1)", opacity: 1 },
          { transform: `translate(${dx * 0.3}px,${подъём}px) scale(1.15)`, opacity: 1, offset: 0.35 },
          { transform: `translate(${dx}px,${dy}px) scale(0.3)`, opacity: 0.4 },
        ],
        { duration: 600, delay: n * 25, easing: "cubic-bezier(.5,0,.85,.5)", fill: "forwards" }
      );
      анимация.finished.then(
        () => { el.remove(); if (токен === визТокен.current) прибавитьВизуально(доляОчков); },
        () => el.remove()
      );
    });
  };

  const удар = (размер: number, сильно: boolean) => {
    if (размер < 5 && !сильно) return;
    доскаRef.current?.animate(
      [{ transform: "translate(0,0)" }, { transform: "translate(-6px,3px)" }, { transform: "translate(6px,-3px)" }, { transform: "translate(0,0)" }],
      { duration: 320, easing: "ease-out" }
    );
  };

  /** Игра окончена (ходы закончились или игрок вышел). */
  const завершить = async (причина: Итог["причина"]) => {
    const u = свежее.current.user;
    if (!u) return;
    const пройдено = сессия.current.пройдено;
    const личный = Math.max(u.best_match3 ?? 0, пройдено);
    setИтог({ причина, пройдено, фишек: сессия.current.фишек, личный, глобальный: undefined });
    setФаза("over");
    if (причина === "ходы") звук.sfx("поражение"); // ← звук проигрыша
    try {
      const г = await getGlobalRecord("best_match3");
      const рекордсмен: Рекорд | null =
        г && г.значение >= личный ? г : личный > 0 ? { telegram_id: u.telegram_id, nickname: u.nickname, значение: личный } : null;
      setИтог((п) => (п ? { ...п, глобальный: рекордсмен } : п));
    } catch {
      setИтог((п) => (п ? { ...п, глобальный: "ошибка" } : п));
    }
  };

  /** Этап пройден: награда сразу зачисляется (и рекорд обновляется). */
  const этапПройден = async () => {
    const { user: u, change: изменить } = свежее.current;
    if (!u) return;
    const н = этапRef.current;
    const награда = сБонусом(наградаЭтапа(н, ходыRef.current, u.salary_level), бонус);
    const рекорд = u.best_match3 ?? 0;
    let сохранилось = true;
    let предупреждение: string | undefined;
    try {
      начислитьМастерство(награда.итого);
      await изменить({ chips: награда.итого }, н > рекорд ? { best_match3: н } : {});
    } catch (e: any) {
      if (н > рекорд && String(e?.message).includes("best_match3")) {
        try {
          начислитьМастерство(награда.итого);
          await изменить({ chips: награда.итого });
          предупреждение = Т.предупреждения.match3;
        } catch { сохранилось = false; }
      } else { сохранилось = false; }
    }
    if (сохранилось) сессия.current.фишек += награда.итого;
    сессия.current.пройдено = н;
    const личный = Math.max(рекорд, н);
    setДанныеЭтапа({ этап: н, награда, сохранилось, предупреждение, личный, глобальный: undefined });
    setФаза("stage");
    звук.sfx("победа"); // ← звук «этап пройден»
    try {
      const г = await глобальныйРекорд("best_match3", личный, u);
      setДанныеЭтапа((п) => (п && п.этап === н ? { ...п, глобальный: г } : п));
    } catch {
      setДанныеЭтапа((п) => (п && п.этап === н ? { ...п, глобальный: "ошибка" } : п));
    }
  };

  /** Ход игрока: обмен двух соседних клеток и вся цепочка последствий. */
  const сделатьХод = async (a: number, b: number) => {
    if (занято.current || фаза !== "playing" || !соседи(a, b)) return;
    занято.current = true;
    setВыбранная(null);
    хаптик("light");
    try {
      let п = поменять(полеRef.current, a, b);
      полеRef.current = п; setПоле(п);
      await пауза(К.анимацияМс);

      let серии = найтиСерии(п);
      if (!серии.length) {
        // Совпадения нет — возвращаем обратно, ход не тратится
        п = поменять(п, a, b);
        полеRef.current = п; setПоле(п);
        await пауза(К.анимацияМс);
        return;
      }

      ходыRef.current -= 1;
      setХоды(ходыRef.current);
      звук.sfx("ход"); // ← звук хода

      let каскад = 1;
      let центры = [a, b];
      while (серии.length) {
        const р = разрушения(п, серии, центры);
        центры = [];
        const очкиБатча = очкиЗаШаг(р.индексы.size, каскад);
        очкиRef.current += очкиБатча;
        улететь(р.индексы, п, очкиБатча);
        // Взрыв (4 в ряд) показываем вспышкой, остальные эффекты — надписью
        if (р.взрывы.length) звук.sfx("взрыв"); // ← звук взрыва
        р.взрывы.forEach(добавитьВспышку);
        удар(р.индексы.size, р.эффект !== null);
        if (р.эффект && р.эффект !== "взрыв") показатьПопап(ТЕКСТ_ЭФФЕКТА[р.эффект]);
        else if (каскад > 1) показатьПопап(Т.игры.три_в_ряд.каскад(каскад));

        setУдаляются(new Set([...р.индексы].map((i) => п[i]!.id)));
        await пауза(240);

        const после = [...п];
        р.индексы.forEach((i) => { после[i] = null; });
        const г = упасть(после);
        п = г.поле;
        полеRef.current = п;
        setУдаляются(new Set());
        режимПадения.current = true;
        setНовые(г.новые);
        setПоле(п);
        await кадр();
        setНовые(new Set());
        await пауза(340);
        режимПадения.current = false;

        серии = найтиСерии(п);
        каскад++;
      }

      if (!естьХод(п)) {
        показатьТост(Т.игры.три_в_ряд.нетХодов);
        п = перемешатьПоле(п);
        полеRef.current = п; setПоле(п);
        await пауза(К.анимацияМс + 100);
      }

      if (очкиRef.current >= цельRef.current) await этапПройден();
      else if (ходыRef.current <= 0) await завершить("ходы");
    } finally {
      занято.current = false;
    }
  };

  // ---------- Нажатия по полю (только тапы) ----------
  const индексПоТочке = (x: number, y: number): number => {
    const el = доскаRef.current;
    if (!el) return -1;
    const р = el.getBoundingClientRect();
    const c = Math.floor(((x - р.left) / р.width) * КОЛ), r = Math.floor(((y - р.top) / р.height) * СТР);
    return c < 0 || c >= КОЛ || r < 0 || r >= СТР ? -1 : r * КОЛ + c;
  };
  const нажатьКлетку = (e: React.PointerEvent) => {
    if (фаза !== "playing") return;
    const idx = индексПоТочке(e.clientX, e.clientY);
    if (idx < 0) return;
    if (занято.current) { setВыбранная(idx); return; }
    if (выбранная === null) setВыбранная(idx);
    else if (выбранная === idx) setВыбранная(null);
    else if (соседи(выбранная, idx)) сделатьХод(выбранная, idx);
    else setВыбранная(idx);
  };

  const выйти = () => {
    if (занято.current) return;
    if (фаза === "playing") {
      if (!confirm(Т.игры.три_в_ряд.выходПодтверждение)) return;
      завершить("выход");
    } else {
      navigate("/games");
    }
  };

  const прошлыеПозиции = useRef(new Map<number, { r: number; c: number }>());
  const режимПадения = useRef(false);
  useLayoutEffect(() => {
    const доска = доскаRef.current;
    const прежние = прошлыеПозиции.current;
    const текущие = new Map<number, { r: number; c: number }>();
    поле.forEach((к, i) => { if (к) текущие.set(к.id, { r: Math.floor(i / КОЛ), c: i % КОЛ }); });
    прошлыеПозиции.current = текущие;
    if (!доска) return;
    доска.querySelectorAll<HTMLElement>("[data-cell]").forEach((el) => {
      const id = Number(el.dataset.cell);
      const т = текущие.get(id);
      if (!т) return;
      const был = прежние.get(id) ?? (новые.has(id) ? { r: т.r - СТР, c: т.c } : null);
      if (!был || (был.r === т.r && был.c === т.c)) return;
      el.animate(
        [
          { transform: `translate(${был.c * 100}%, ${был.r * 100}%)` },
          { transform: `translate(${т.c * 100}%, ${т.r * 100}%)` },
        ],
        режимПадения.current
          ? { duration: 320, easing: "cubic-bezier(.3,1.35,.55,1)" }
          : { duration: 140, easing: "ease-out" }
      );
    });
  }, [поле]);

  if (!user) return null;
  const доля = цель > 0 ? Math.min(100, (очки / цель) * 100) : 0;
  const следующий = данныеЭтапа ? данныеЭтапа.этап + 1 : 2;
  const ТМ = Т.игры.три_в_ряд;
  const размерВзрыва = `${К.радиусВзрыва * 2 + 1}×${К.радиусВзрыва * 2 + 1}`;

  return (
    <div className="fixed inset-0 z-30 flex flex-col items-center overflow-hidden bg-app px-2 pb-3 pt-3 select-none" style={{ touchAction: "manipulation" }}>
      {/* Шапка */}
      <div className="flex w-full max-w-md items-center justify-between">
        <button onClick={выйти} className="btn btn-ghost !px-3 !py-2 text-sm">{фаза === "playing" ? Т.общее.выйти : Т.общее.назад}</button>
        <h2 className="text-xl font-bold">{ТМ.заголовокМеню}</h2>
        <div className="pill min-w-[72px] px-3 py-2 text-center text-sm font-bold">{фаза === "menu" ? "—" : ТМ.этап(этап)}</div>
      </div>

      {/* Очки и ходы */}
      <div className="mt-3 w-full max-w-md">
        <div className="flex justify-between text-sm text-white/80">
          <span>{ТМ.очки}: <b>{очки}</b> / {цель}</span>
          <span>{ТМ.ходов}: <b className={ходы <= 3 && фаза === "playing" ? "text-red-400" : ""}>{ходы}</b></span>
        </div>
        <div className="mt-1">
          <ПолосаОчков ref={полосаRef} доля={доля / 100} импульс={импульс} />
        </div>
      </div>

      {/* Поле */}
      <div ref={полеWrapRef} className="relative mt-3 flex min-h-0 w-full flex-1 items-center justify-center">
        <div className="relative" style={{ width: полеВт, aspectRatio: `${КОЛ} / ${СТР}` }}>
        <div
          ref={доскаRef}
          onPointerDown={нажатьКлетку}
          className="absolute inset-0 isolate overflow-hidden rounded-xl bg-black/40 ring-2 ring-brand-yellow/60"
        >
          {поле.map((к, i) => {
            if (!к) return null;
            const r = Math.floor(i / КОЛ), c = i % КОЛ;
            const новая = новые.has(к.id);
            const удал = удаляются.has(к.id);
            const выбрана = выбранная === i;
            const сим = К.символы[к.тип];
            return (
              <div
                key={к.id}
                data-cell={к.id}
                className="pointer-events-none absolute left-0 top-0"
                style={{
                  width: `${100 / КОЛ}%`, height: `${100 / СТР}%`,
                  transform: `translate(${c * 100}%, ${(новая ? r - СТР : r) * 100}%)`,
                  transition: "none",
                }}
              >
                <div className={`h-full w-full p-[4%] transition-all duration-200 ${удал ? "scale-0 opacity-0" : ""} ${выбрана ? "scale-110" : ""}`}>
                  <div className={`flex h-full w-full items-center justify-center rounded-lg ${выбрана ? "bg-white/30 ring-2 ring-brand-yellow" : "bg-white/10"}`}>
                    {фото[сим.id] ? (
                      <img src={К.папка + сим.файл} alt="" draggable={false} className="h-[84%] w-[84%] object-contain" style={idle(к.id)} />
                    ) : (
                      <span className="inline-block" style={{ fontSize: "clamp(22px, 9vw, 52px)", lineHeight: 1, ...idle(к.id) }}>{сим.эмодзи}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <ВспышкиCanvas вспышки={вспышки} />

        <div ref={летRef} className="pointer-events-none fixed inset-0 z-40" />

        {попап && (
          <div key={попап.id} className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <span className="reward-pop whitespace-nowrap text-3xl font-extrabold text-brand-yellow drop-shadow-lg" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.7)" }}>{попап.текст}</span>
          </div>
        )}

        {тост && (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 z-20 -translate-y-1/2 text-center">
            <span className="inline-block rounded-2xl bg-black/75 px-4 py-2 text-lg font-bold text-brand-yellow ring-2 ring-brand-yellow">{тост}</span>
          </div>
        )}
        </div>
      </div>

      {/* ===== МЕНЮ ===== */}
      {фаза === "menu" && (
        <GameMenu
          колонка="best_match3"
          форматРекорда={(n) => `Этап ${n}`}
          мастерство={мастерство}
          готово={готово}
          onСтарт={старт}
          onНазад={() => navigate("/games")}
        />
      )}

      {/* ===== ЭТАП ПРОЙДЕН ===== */}
      {фаза === "stage" && данныеЭтапа && (
        <GameResult
          заголовок={ТМ.этапПройден(данныеЭтапа.этап)}
          база={данныеЭтапа.награда.база + данныеЭтапа.награда.заХоды}
          прокачкаПроц={данныеЭтапа.награда.бонусПроц}
          мастерство={мастерство}
          итог={данныеЭтапа.награда.итого}
          прогресс={{ подпись: "Этап", значение: String(данныеЭтапа.этап) }}
          лучший={данныеЭтапа.личный}
          лучшийПодпись="Лучший этап"
          колонка="best_match3"
          форматРекорда={(n) => `Этап ${n}`}
          предупреждение={данныеЭтапа.предупреждение}
          ошибка={данныеЭтапа.сохранилось ? undefined : ТМ.ошибкаНаграды}
          основная={{ подпись: Т.общее.дальше, onClick: () => начатьЭтап(данныеЭтапа.этап + 1) }}
          вторичная={{ подпись: Т.общее.забратьИВыйти, onClick: () => завершить("выход") }}
        />
      )}

      {/* ===== ИТОГ ИГРЫ ===== */}
      {фаза === "over" && итог && (
        <GameResult
          заголовок={итог.причина === "ходы" ? ТМ.ходыЗакончились : ТМ.играЗавершена}
          база={итог.фишек}
          прокачкаПроц={0}
          мастерство={{ ...мастерство, процент: 0, рекордПроц: 0 }}
          итог={итог.фишек}
          прогресс={{ подпись: "Этап", значение: String(итог.пройдено) }}
          лучший={user.best_match3 ?? 0}
          лучшийПодпись="Лучший этап"
          колонка="best_match3"
          форматРекорда={(n) => `Этап ${n}`}
          основная={{ подпись: Т.общее.игратьЕщё, onClick: () => { setИтог(null); setФаза("menu"); } }}
          вторичная={{ подпись: Т.общее.кСпискуИгр, onClick: () => navigate("/games") }}
        />
      )}

    </div>
  );
}

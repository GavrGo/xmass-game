import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Т } from "../texts";
import Модалка from "../components/Модалка";
import СтрокаИтога, { Разделитель } from "../components/СтрокаИтога";
import { звук } from "../lib/sound";
import { useUser } from "../store/UserContext";
import { БАБКА_КРАШ as К, КлючПерсонажа } from "../config";
import { Рекорд } from "../api/users";
import РекордыБлок from "../components/РекордыБлок";
import { глобальныйРекорд } from "../game/records";
import { бонусВремениСек } from "../game/effects";
import { БабкаДвижок, ФазаБабки, РежимБабки, посчитатьНаградуБабки } from "../game/babka";
import { getSafeTop } from "../lib/telegram";
import { useNoSwipes } from "../lib/useNoSwipes";

interface Итог {
  дорог: number;
  награда: ReturnType<typeof посчитатьНаградуБабки>;
  режим: РежимБабки;
  персонаж: КлючПерсонажа;
  личный: number;
  глобальный: Рекорд | null | "ошибка" | undefined;
  причина: "crash" | "time" | null;
  сохранение: "идёт" | "готово" | "ошибка";
  предупреждение?: string;
  текстОшибки?: string;
}

const число = (x: number) => (Number.isInteger(x) ? String(x) : x.toFixed(1));

export default function Babka() {
  const { user, change } = useUser();
  const navigate = useNavigate();
  useNoSwipes(); // только тапы

  const контейнер = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const движок = useRef<БабкаДвижок | null>(null);
  const фазаRef = useRef<ФазаБабки>("menu");
  const dpr = useRef(1);
  const [фаза, setФазаСтейт] = useState<ФазаБабки>("menu");
  const [персонаж, setПерсонаж] = useState<КлючПерсонажа>("babka");
  const [режим, setРежим] = useState<РежимБабки>("timed");
  const [итог, setИтог] = useState<Итог | null>(null);

  const свежее = useRef({ user, change, персонаж, режим });
  свежее.current = { user, change, персонаж, режим };
  const setФаза = (ф: ФазаБабки) => { фазаRef.current = ф; setФазаСтейт(ф); };

  if (!движок.current) {
    движок.current = new БабкаДвижок();
    движок.current.событие = (э) => звук.sfx(э); // звуки: шаг, поражение
  }

  /** Время забега: только в «Обычном» режиме (+ бонус «Сдвинуть сроки»). */
  const лимитВремени = (р: РежимБабки = свежее.current.режим) => {
    if (р === "zen") return 0;
    const u = свежее.current.user;
    return К.времяСек + (u ? бонусВремениСек(u) : 0);
  };

  const выбратьПерсонажа = (п: КлючПерсонажа) => {
    setПерсонаж(п);
    движок.current!.сброс(0, п); // в меню сразу видно нужных противников
  };

  const старт = () => {
    движок.current!.сброс(лимитВремени(режим), персонаж);
    setИтог(null);
    setФаза("playing");
  };

  const тап = () => { if (фазаRef.current === "playing") движок.current!.прыжок(); };
  const тапRef = useRef(тап);
  тапRef.current = тап;

  /** Забег закончился: награда, сохранение, окно результата. */
  const завершить = async () => {
    setФаза("over");
    const д = движок.current!;
    const { user: u, change: изменить, персонаж: п, режим: р } = свежее.current;
    if (!u) return;

    const n = д.дорог;
    const награда = посчитатьНаградуБабки(n, р, п, u.salary_level);
    const прежний = u.best_babka_crash ?? 0;
    const новыйРекорд = n > прежний;
    const личный = Math.max(n, прежний);

    setИтог({ дорог: n, награда, режим: р, персонаж: п, личный, глобальный: undefined, причина: д.причина, сохранение: "идёт" });

    try {
      if (награда.итого > 0 || новыйРекорд) await изменить({ chips: награда.итого }, новыйРекорд ? { best_babka_crash: n } : {});
      setИтог((x) => (x ? { ...x, сохранение: "готово" } : x));
    } catch (e: any) {
      if (новыйРекорд && String(e?.message).includes("best_babka_crash")) {
        try {
          await изменить({ chips: награда.итого });
          setИтог((x) => (x ? { ...x, сохранение: "готово", предупреждение: Т.предупреждения.бабка } : x));
        } catch (e2: any) {
          setИтог((x) => (x ? { ...x, сохранение: "ошибка", текстОшибки: e2.message } : x));
        }
      } else {
        setИтог((x) => (x ? { ...x, сохранение: "ошибка", текстОшибки: e?.message } : x));
      }
    }

    try {
      const г = await глобальныйРекорд("best_babka_crash", личный, u);
      setИтог((x) => (x ? { ...x, глобальный: г } : x));
    } catch {
      setИтог((x) => (x ? { ...x, глобальный: "ошибка" } : x));
    }
  };
  const завершитьRef = useRef(завершить);
  завершитьRef.current = завершить;

  // Размер: на весь экран
  useEffect(() => {
    const el = контейнер.current, canvas = canvasRef.current;
    if (!el || !canvas) return;
    const применить = () => {
      const w = el.clientWidth, h = el.clientHeight;
      dpr.current = Math.min(window.devicePixelRatio || 1, 2.5);
      canvas.width = Math.round(w * dpr.current);
      canvas.height = Math.round(h * dpr.current);
      движок.current!.задатьРазмер(w, h, getSafeTop());
      if (фазаRef.current === "menu") движок.current!.сброс(0, свежее.current.персонаж);
    };
    применить();
    const ro = new ResizeObserver(применить);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Главный цикл
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let последний = performance.now();
    let raf = 0;
    const кадр = (сейчас: number) => {
      const dt = Math.min(0.05, (сейчас - последний) / 1000);
      последний = сейчас;
      const д = движок.current!;
      if (фазаRef.current === "playing") {
        if (!д.закончена) д.обновить(dt);
        else {
          д.обновитьКонец(dt);
          if (д.послеКонца >= К.задержкаОкномСек) завершитьRef.current();
        }
      } else if (фазаRef.current === "menu") {
        д.двигатьВрагов(dt);
      }
      const k = д.масштаб * dpr.current;
      ctx.setTransform(k, 0, 0, k, 0, 0);
      д.рисовать(ctx, фазаRef.current);
      raf = requestAnimationFrame(кадр);
    };
    raf = requestAnimationFrame(кадр);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Клавиатура (для компьютера): пробел / стрелка вверх
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (["Space", "ArrowUp", "KeyW"].includes(e.code)) {
        e.preventDefault();
        if (!e.repeat) тапRef.current();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  if (!user) return null;
  const отступ = getSafeTop() + 16;
  const бонусВрем = бонусВремениСек(user);
  const м = режим === "zen" ? К.дзенМножитель : 1;
  const ТБ = Т.игры.бабка;

  return (
    <div ref={контейнер} className="fixed inset-0 z-30 select-none overflow-hidden bg-black" style={{ touchAction: "none" }}>
      {/* Игровое поле на весь экран. Тап = шаг вперёд */}
      <canvas ref={canvasRef} onPointerDown={тап} className="absolute inset-0 h-full w-full" />

      {/* ===== МЕНЮ ===== */}
      {фаза === "menu" && (
        <div className="absolute inset-0 flex flex-col items-center overflow-y-auto bg-black/65 px-5 pb-6" style={{ paddingTop: отступ }}>
          <button onClick={() => navigate("/games")} className="btn btn-ghost self-start !px-3 !py-2 text-sm">{Т.общее.назад}</button>
          <h2 className="mt-3 text-3xl font-bold text-brand-yellow">{ТБ.заголовокМеню}</h2>
          <p className="mt-1 text-center text-sm text-white/70">{ТБ.подсказка}</p>

          <p className="mb-2 mt-4 text-sm font-bold text-white/80">{ТБ.заКогоИграем}</p>
          <div className="grid w-full max-w-sm grid-cols-2 gap-2">
            {(Object.keys(К.персонажи) as КлючПерсонажа[]).map((ключ) => {
              const п = К.персонажи[ключ];
              const т = ТБ.персонажи[ключ];
              const выбран = ключ === персонаж;
              return (
                <button key={ключ} onClick={() => выбратьПерсонажа(ключ)} className={`opt p-3 text-center ${выбран ? "opt-on" : ""}`}>
                  <div className="text-5xl">{п.эмодзи}</div>
                  <div className="font-bold">{т.название}</div>
                  <div className="text-[11px] text-white/70">{т.описание}</div>
                  {п.множительНаграды !== 1 && <div className="text-[11px] text-brand-yellow">{ТБ.наградаПерсонажа(п.множительНаграды)}</div>}
                </button>
              );
            })}
          </div>

          <p className="mb-2 mt-4 text-sm font-bold text-white/80">{ТБ.режимЗаголовок}</p>
          <div className="flex w-full max-w-sm flex-col gap-2">
            <button onClick={() => setРежим("zen")} className={`opt p-3 text-left ${режим === "zen" ? "opt-on" : ""}`}>
              <div className="font-bold">{Т.общее.дзен}</div>
              <div className="text-xs text-white/70">{ТБ.режимДзен(К.дзенМножитель)}</div>
            </button>
            <button onClick={() => setРежим("timed")} className={`opt p-3 text-left ${режим === "timed" ? "opt-on" : ""}`}>
              <div className="font-bold">{Т.общее.обычный}</div>
              <div className="text-xs text-white/70">{ТБ.режимОбычный(К.времяСек + бонусВрем, бонусВрем)}</div>
            </button>
          </div>

          <button onClick={старт} className="btn btn-yellow mt-5 w-full max-w-sm !py-4 text-xl">{Т.общее.старт}</button>
          <p className="mt-3 text-center text-xs text-white/60">{ТБ.награда(число(К.награда.старт * м * К.персонажи[персонаж].множительНаграды))}</p>
          <p className="mt-1 text-xs text-brand-yellow">{ТБ.вашРекорд(user.best_babka_crash ?? 0)}</p>
        </div>
      )}

      {/* ===== РЕЗУЛЬТАТ ===== */}
      {фаза === "over" && итог && (
        <Модалка режим="absolute">
          <h3 className="mb-2 text-2xl font-bold">
            {итог.причина === "time" ? ТБ.итог.времяВышло : итог.персонаж === "babka" ? ТБ.итог.сбилаМашина : ТБ.итог.сбилиБабушку}
          </h3>
          <div className="stat-box my-3 p-3 text-left text-sm">
            <СтрокаИтога л={ТБ.итог.дорог} п={ТБ.итог.дорогЗнач(итог.дорог, число(итог.награда.сумма))} />
            {итог.награда.режимМнож !== 1 && <СтрокаИтога л={ТБ.итог.режимДзен} п={`×${итог.награда.режимМнож}`} />}
            {итог.награда.персМнож !== 1 && <СтрокаИтога л={ТБ.итог.персонаж} п={`×${итог.награда.персМнож}`} />}
            {итог.награда.бонусПроц > 0 && <СтрокаИтога л={Т.общее.бонусЗП} п={`+${итог.награда.бонусПроц}%`} />}
            <Разделитель />
            <СтрокаИтога л={Т.общее.получено} п={Т.общее.плюсФишки(итог.награда.итого)} />
          </div>
          <РекордыБлок личный={{ nickname: user.nickname, значение: итог.личный }} глобальный={итог.глобальный} />
          {итог.сохранение === "идёт" && <p className="mb-2 text-xs text-white/50">{Т.общее.сохраняем}</p>}
          {итог.предупреждение && <p className="mb-2 text-xs text-orange-300">{итог.предупреждение}</p>}
          {итог.сохранение === "ошибка" && <p className="mb-2 text-xs text-red-300">{Т.общее.ошибкаСохранения(итог.текстОшибки)}</p>}
          <div className="flex gap-2">
            <button onClick={() => { setИтог(null); движок.current!.сброс(0, персонаж); setФаза("menu"); }} disabled={итог.сохранение === "идёт"} className="btn btn-blue flex-1">{Т.общее.игратьЕщё}</button>
            <button onClick={() => navigate("/games")} disabled={итог.сохранение === "идёт"} className="btn btn-yellow flex-1">{Т.общее.забратьИВыйти}</button>
          </div>
        </Модалка>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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

  if (!движок.current) движок.current = new БабкаДвижок();

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
          setИтог((x) => (x ? { ...x, сохранение: "готово", предупреждение: "Фишки зачислены, но рекорд не сохранён: выполните SQL из migrations/006_babka_crash.sql" } : x));
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

  return (
    <div ref={контейнер} className="fixed inset-0 z-30 select-none overflow-hidden bg-black" style={{ touchAction: "none" }}>
      {/* Игровое поле на весь экран. Тап = шаг вперёд */}
      <canvas ref={canvasRef} onPointerDown={тап} className="absolute inset-0 h-full w-full" />

      {/* ===== МЕНЮ ===== */}
      {фаза === "menu" && (
        <div className="absolute inset-0 flex flex-col items-center overflow-y-auto bg-black/65 px-5 pb-6" style={{ paddingTop: отступ }}>
          <button onClick={() => navigate("/games")} className="self-start rounded-xl bg-white/15 px-3 py-2 text-sm font-bold">← Назад</button>
          <h2 className="mt-3 text-3xl font-bold text-xmas-gold">Babka Crash 👵🚗</h2>
          <p className="mt-1 text-center text-sm text-white/70">Тап по экрану — шаг вперёд. Переходите дороги и не попадайтесь!</p>

          <p className="mb-2 mt-4 text-sm font-bold text-white/80">За кого играем</p>
          <div className="grid w-full max-w-sm grid-cols-2 gap-2">
            {(Object.keys(К.персонажи) as КлючПерсонажа[]).map((ключ) => {
              const п = К.персонажи[ключ];
              const выбран = ключ === персонаж;
              return (
                <button key={ключ} onClick={() => выбратьПерсонажа(ключ)} className={`rounded-2xl p-3 text-center ${выбран ? "bg-xmas-green ring-2 ring-xmas-gold" : "bg-white/10"}`}>
                  <div className="text-5xl">{п.эмодзи}</div>
                  <div className="font-bold">{п.название}</div>
                  <div className="text-[11px] text-white/70">{п.описание}</div>
                  {п.множительНаграды !== 1 && <div className="text-[11px] text-xmas-gold">награда ×{п.множительНаграды}</div>}
                </button>
              );
            })}
          </div>

          <p className="mb-2 mt-4 text-sm font-bold text-white/80">Режим</p>
          <div className="flex w-full max-w-sm flex-col gap-2">
            <button onClick={() => setРежим("zen")} className={`rounded-2xl p-3 text-left ${режим === "zen" ? "bg-xmas-green ring-2 ring-xmas-gold" : "bg-white/10"}`}>
              <div className="font-bold">🧘 Дзен</div>
              <div className="text-xs text-white/70">Без таймера · награда ×{К.дзенМножитель}</div>
            </button>
            <button onClick={() => setРежим("timed")} className={`rounded-2xl p-3 text-left ${режим === "timed" ? "bg-xmas-green ring-2 ring-xmas-gold" : "bg-white/10"}`}>
              <div className="font-bold">⏱ Обычный</div>
              <div className="text-xs text-white/70">
                {К.времяСек + бонусВрем} сек{бонусВрем > 0 ? ` (бонус +${бонусВрем})` : ""} · полная награда
              </div>
            </button>
          </div>

          <button onClick={старт} className="mt-5 w-full max-w-sm rounded-2xl bg-xmas-red py-4 text-xl font-bold active:scale-95">▶ Старт</button>
          <p className="mt-3 text-center text-xs text-white/60">
            Дорога №1 — {число(К.награда.старт * м * К.персонажи[персонаж].множительНаграды)} 🪙, дальше награда за каждую дорогу растёт
          </p>
          <p className="mt-1 text-xs text-xmas-gold">Ваш рекорд: {user.best_babka_crash ?? 0} дорог</p>
        </div>
      )}

      {/* ===== РЕЗУЛЬТАТ ===== */}
      {фаза === "over" && итог && (
        <div className="absolute inset-0 flex items-center justify-center overflow-y-auto bg-black/70 p-5">
          <div className="w-full max-w-sm rounded-3xl bg-xmas-dark p-5 text-center ring-2 ring-xmas-gold">
            <h3 className="mb-2 text-2xl font-bold">
              {итог.причина === "time" ? "⏱ Время вышло!" : итог.персонаж === "babka" ? "💥 Сбила машина!" : "💥 Сбили бабушку!"}
            </h3>
            <div className="my-3 rounded-2xl bg-white/10 p-3 text-left text-sm">
              <Строка л="Дорог пройдено" п={`${итог.дорог} → ${число(итог.награда.сумма)} 🪙`} />
              {итог.награда.режимМнож !== 1 && <Строка л="Режим «Дзен»" п={`×${итог.награда.режимМнож}`} />}
              {итог.награда.персМнож !== 1 && <Строка л="Персонаж" п={`×${итог.награда.персМнож}`} />}
              {итог.награда.бонусПроц > 0 && <Строка л="Бонус «Повышение ЗП»" п={`+${итог.награда.бонусПроц}%`} />}
              <div className="my-1 border-t border-white/10" />
              <Строка л="Получено фишек" п={`+${итог.награда.итого} 🪙`} />
            </div>
            <РекордыБлок личный={{ nickname: user.nickname, значение: итог.личный }} глобальный={итог.глобальный} />
            {итог.сохранение === "идёт" && <p className="mb-2 text-xs text-white/50">Сохраняем…</p>}
            {итог.предупреждение && <p className="mb-2 text-xs text-orange-300">{итог.предупреждение}</p>}
            {итог.сохранение === "ошибка" && <p className="mb-2 text-xs text-red-400">Не удалось сохранить награду: {итог.текстОшибки}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setИтог(null); движок.current!.сброс(0, персонаж); setФаза("menu"); }} disabled={итог.сохранение === "идёт"} className="flex-1 rounded-xl bg-xmas-green py-3 font-bold disabled:bg-gray-600 disabled:text-white/40">Играть ещё</button>
              <button onClick={() => navigate("/games")} disabled={итог.сохранение === "идёт"} className="flex-1 rounded-xl bg-xmas-red py-3 font-bold disabled:bg-gray-600 disabled:text-white/40">Забрать и выйти</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const Строка = ({ л, п }: { л: string; п: string }) => (
  <div className="flex justify-between gap-3 py-0.5">
    <span className="text-white/60">{л}</span>
    <span className="text-right font-bold">{п}</span>
  </div>
);

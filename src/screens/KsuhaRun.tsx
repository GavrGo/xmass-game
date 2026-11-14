import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../store/UserContext";
import { getGlobalBestKsuhaRun } from "../api/users";
import { КСЮХА_РАН, КлючСложности } from "../config";
import { бонусВремениСек } from "../game/effects";
import { КсюхаРанДвижок, Фаза, посчитатьНаграду } from "../game/ksuhaRun";
import { getSafeTop } from "../lib/telegram";

// Что показываем в окне результата
interface Итог {
  препятствий: number;
  монет: number;
  награда: ReturnType<typeof посчитатьНаграду>;
  личныйРекорд: number;
  новыйРекорд: boolean;
  глобальныйРекорд: number | null; // null — грузится, -1 — не удалось узнать
  причина: "crash" | "time" | null;
  сохранение: "идёт" | "готово" | "ошибка";
  предупреждение?: string;
  текстОшибки?: string;
}

const число = (x: number) => (Number.isInteger(x) ? String(x) : x.toFixed(1));

export default function KsuhaRun() {
  const { user, change } = useUser();
  const navigate = useNavigate();
  const контейнер = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const движок = useRef<КсюхаРанДвижок | null>(null);
  const фазаRef = useRef<Фаза>("menu");
  const dpr = useRef(1);
  const [фаза, setФазаСтейт] = useState<Фаза>("menu");
  const [сложность, setСложность] = useState<КлючСложности>("medium");
  const [итог, setИтог] = useState<Итог | null>(null);
  const [safeTop, setSafeTop] = useState(getSafeTop());
  const safeTopRef = useRef(safeTop);
  safeTopRef.current = safeTop;

  // Всегда свежие данные для функций, которые живут долго
  const свежее = useRef({ user, change, сложность });
  свежее.current = { user, change, сложность };

  const setФаза = (ф: Фаза) => { фазаRef.current = ф; setФазаСтейт(ф); };

  /** Лимит времени = базовое время + бонус прокачки «Сдвинуть сроки». */
  const лимитВремени = () => {
    if (КСЮХА_РАН.времяСессииСекунд <= 0) return 0;
    const u = свежее.current.user;
    return КСЮХА_РАН.времяСессииСекунд + (u ? бонусВремениСек(u) : 0);
  };

  if (!движок.current) движок.current = new КсюхаРанДвижок(лимитВремени());

  /** Кнопка «Старт» в меню. */
  const старт = () => {
    движок.current!.сброс(лимитВремени(), сложность);
    setИтог(null);
    setФаза("playing");
  };

  /** Тап по экрану = прыжок (только во время игры). */
  const прыжок = () => {
    if (фазаRef.current === "playing") движок.current!.прыжок();
  };
  const прыжокRef = useRef(прыжок);
  прыжокRef.current = прыжок;

  /** Забег закончился: считаем награду, сохраняем в Supabase, показываем окно. */
  const завершить = async () => {
    setФаза("over");
    const д = движок.current!;
    const { user: u, change: изменить, сложность: сл } = свежее.current;
    if (!u) return;

    const n = д.пройдено;
    const награда = посчитатьНаграду(n, д.суммаМонет, сл, u.salary_level);
    const прежний = u.best_ksuha_run ?? 0;
    const новыйРекорд = n > прежний;

    setИтог({
      препятствий: n, монет: д.монетСобрано, награда,
      личныйРекорд: Math.max(n, прежний), новыйРекорд,
      глобальныйРекорд: null, причина: д.причина, сохранение: "идёт",
    });

    const нужноСохранять = награда.итого > 0 || новыйРекорд;
    try {
      if (нужноСохранять) await изменить({ chips: награда.итого }, новыйРекорд ? { best_ksuha_run: n } : {});
      setИтог((п) => (п ? { ...п, сохранение: "готово" } : п));
    } catch (e: any) {
      if (новыйРекорд && String(e?.message).includes("best_ksuha_run")) {
        // В базе ещё нет колонки рекорда — хотя бы зачисляем фишки
        try {
          await изменить({ chips: награда.итого });
          setИтог((п) => (п ? { ...п, сохранение: "готово",
            предупреждение: "Фишки зачислены, но рекорд не сохранён: в базе нет колонки best_ksuha_run. Выполните SQL из migrations/002_ksuha_run.sql" } : п));
        } catch (e2: any) {
          setИтог((п) => (п ? { ...п, сохранение: "ошибка", текстОшибки: e2.message } : п));
        }
      } else {
        setИтог((п) => (п ? { ...п, сохранение: "ошибка", текстОшибки: e?.message } : п));
      }
    }

    // Глобальный рекорд (если не получилось — покажем «—»)
    try {
      const г = await getGlobalBestKsuhaRun();
      setИтог((п) => (п ? { ...п, глобальныйРекорд: Math.max(г, n) } : п));
    } catch {
      setИтог((п) => (п ? { ...п, глобальныйРекорд: -1 } : п));
    }
  };
  const завершитьRef = useRef(завершить);
  завершитьRef.current = завершить;

  /** «Играть ещё» — назад в меню (выбранная сложность запоминается). */
  const ещё = () => { setИтог(null); setФаза("menu"); };

  // Размер: игра занимает весь контейнер (весь экран)
  useEffect(() => {
    const el = контейнер.current, canvas = canvasRef.current;
    if (!el || !canvas) return;
    const применить = () => {
      const w = el.clientWidth, h = el.clientHeight;
      dpr.current = Math.min(window.devicePixelRatio || 1, 2.5);
      canvas.width = Math.round(w * dpr.current);
      canvas.height = Math.round(h * dpr.current);
      движок.current!.задатьРазмер(w, h, safeTopRef.current);
    };
    применить();
    const ro = new ResizeObserver(применить);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => { движок.current!.safeTopCss = safeTop; }, [safeTop]);

  // Главный цикл игры (60 кадров в секунду)
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
        if (!д.закончена) {
          д.обновить(dt);
        } else {
          д.обновитьКонец(dt); // пока идёт погоня — показываем, как её догоняют
          if (д.послеКонца >= КСЮХА_РАН.погоня.задержкаОкномСек) завершитьRef.current();
        }
      } else {
        д.обновитьСнег(dt, 80);
      }
      const k = д.масштаб * dpr.current;
      ctx.setTransform(k, 0, 0, k, 0, 0);
      д.рисовать(ctx, фазаRef.current);
      raf = requestAnimationFrame(кадр);
    };
    raf = requestAnimationFrame(кадр);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Клавиатура: пробел / стрелка вверх / W
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (["Space", "ArrowUp", "KeyW"].includes(e.code)) {
        e.preventDefault();
        if (!e.repeat) прыжокRef.current();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // Telegram: полный экран, без «свайпа вниз», учёт отступов под кнопки Telegram
  useEffect(() => {
    const w = window.Telegram?.WebApp;
    let вошли = false;
    try {
      if (КСЮХА_РАН.полноэкранныйРежимTelegram && w?.isVersionAtLeast?.("8.0") && !w.isFullscreen) {
        w.requestFullscreen();
        вошли = true;
      }
    } catch {}
    try { w?.disableVerticalSwipes?.(); } catch {}
    const обновить = () => setSafeTop(getSafeTop());
    const события = ["safeAreaChanged", "contentSafeAreaChanged", "fullscreenChanged"];
    события.forEach((e) => w?.onEvent?.(e, обновить));
    return () => {
      события.forEach((e) => w?.offEvent?.(e, обновить));
      try { if (вошли) w.exitFullscreen(); } catch {}
      try { w?.enableVerticalSwipes?.(); } catch {}
    };
  }, []);

  if (!user) return null;
  const лимит = лимитВремени();
  const бонусПроц = посчитатьНаграду(0, 0, "medium", user.salary_level).бонусПроц;
  const отступ = safeTop + 16;

  return (
    <div ref={контейнер} className="fixed inset-0 z-30 select-none overflow-hidden bg-black" style={{ touchAction: "none" }}>
      {/* Игровое поле на весь экран. Тап = прыжок */}
      <canvas ref={canvasRef} onPointerDown={прыжок} className="absolute inset-0 h-full w-full" />

      {/* ===== МЕНЮ ПЕРЕД СТАРТОМ ===== */}
      {фаза === "menu" && (
        <div className="absolute inset-0 flex flex-col items-center overflow-y-auto bg-black/60 px-5 pb-6" style={{ paddingTop: отступ }}>
          <button onClick={() => navigate("/games")} className="self-start rounded-xl bg-white/15 px-3 py-2 text-sm font-bold">← Назад</button>

          <h2 className="mt-3 text-3xl font-bold text-xmas-gold">Ksuha Run 🏃‍♀️</h2>
          <p className="mt-1 text-center text-sm text-white/70">
            Тап по экрану — прыжок{КСЮХА_РАН.физика.максПрыжковПодряд > 1 ? " (можно дважды)" : ""}. Собирай монеты в воздухе!
          </p>

          <p className="mt-4 mb-2 text-sm font-bold text-white/80">Сложность</p>
          <div className="flex w-full max-w-sm flex-col gap-2">
            {(Object.keys(КСЮХА_РАН.сложности) as КлючСложности[]).map((ключ) => {
              const с = КСЮХА_РАН.сложности[ключ];
              const выбрана = ключ === сложность;
              return (
                <button
                  key={ключ}
                  onClick={() => setСложность(ключ)}
                  className={`flex items-center gap-3 rounded-2xl p-3 text-left transition ${выбрана ? "bg-xmas-green ring-2 ring-xmas-gold" : "bg-white/10"}`}
                >
                  <span className="text-3xl">{с.эмодзи}</span>
                  <span className="flex-1">
                    <span className="block font-bold">{с.название}</span>
                    <span className="block text-xs text-white/70">
                      скорость ×{с.множительСкорости} · награда ×{с.множительНаграды}
                    </span>
                  </span>
                  {выбрана && <span className="text-xl">✓</span>}
                </button>
              );
            })}
          </div>

          <button onClick={старт} className="mt-5 w-full max-w-sm rounded-2xl bg-xmas-red py-4 text-xl font-bold active:scale-95">
            ▶ Старт
          </button>

          <p className="mt-4 text-center text-xs text-white/60">
            {КСЮХА_РАН.препятствийЗаФишку} препятствия = 1 🪙 · монеты тоже идут в награду
            {бонусПроц > 0 && ` · бонус ЗП +${бонусПроц}%`}
            {лимит > 0 && ` · время забега ${лимит} сек`}
          </p>
          <p className="mt-1 text-xs text-xmas-gold">Ваш рекорд: {user.best_ksuha_run ?? 0}</p>
        </div>
      )}

      {/* ===== ОКНО РЕЗУЛЬТАТА ===== */}
      {фаза === "over" && итог && (
        <div className="absolute inset-0 flex items-center justify-center overflow-y-auto bg-black/70 p-5">
          <div className="w-full max-w-sm rounded-3xl bg-xmas-dark p-5 text-center ring-2 ring-xmas-gold">
            <h3 className="mb-1 text-2xl font-bold">
              {итог.причина === "time" ? "⏱ Время вышло!" : "💥 Догнали!"}
            </h3>
            {итог.новыйРекорд && <p className="mb-1 font-bold text-xmas-gold">🏆 Новый личный рекорд!</p>}

            <div className="my-3 rounded-2xl bg-white/10 p-3 text-left text-sm">
              <Строка л="Пройдено препятствий" п={`${итог.препятствий} → ${число(итог.награда.заПрепятствия)} 🪙`} />
              <Строка л="Собрано монет" п={`${итог.монет} → ${число(итог.награда.заМонеты)} 🪙`} />
              {итог.награда.множитель !== 1 && <Строка л="Сложность" п={`×${итог.награда.множитель}`} />}
              {итог.награда.бонусПроц > 0 && <Строка л="Бонус «Повышение ЗП»" п={`+${итог.награда.бонусПроц}%`} />}
              <div className="my-1 border-t border-white/10" />
              <Строка л="Получено фишек" п={`+${итог.награда.итого} 🪙`} />
              <div className="my-1 border-t border-white/10" />
              <Строка л="Личный рекорд" п={String(итог.личныйРекорд)} />
              <Строка
                л="Рекорд среди всех"
                п={итог.глобальныйРекорд === null ? "…" : итог.глобальныйРекорд < 0 ? "—" : String(итог.глобальныйРекорд)}
              />
            </div>

            {итог.сохранение === "идёт" && <p className="mb-2 text-xs text-white/50">Сохраняем…</p>}
            {итог.сохранение === "готово" && итог.награда.итого > 0 && !итог.предупреждение && (
              <p className="mb-2 text-xs text-green-400">Фишки зачислены на баланс</p>
            )}
            {итог.предупреждение && <p className="mb-2 text-xs text-orange-300">{итог.предупреждение}</p>}
            {итог.сохранение === "ошибка" && (
              <p className="mb-2 text-xs text-red-400">Не удалось сохранить награду: {итог.текстОшибки}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={ещё}
                disabled={итог.сохранение === "идёт"}
                className="flex-1 rounded-xl bg-xmas-green py-3 font-bold disabled:bg-gray-600 disabled:text-white/40"
              >
                Играть ещё
              </button>
              <button
                onClick={() => navigate("/games")}
                disabled={итог.сохранение === "идёт"}
                className="flex-1 rounded-xl bg-xmas-red py-3 font-bold disabled:bg-gray-600 disabled:text-white/40"
              >
                Забрать и выйти
              </button>
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

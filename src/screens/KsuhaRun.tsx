import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Т } from "../texts";
import Модалка from "../components/Модалка";
import СтрокаИтога, { Разделитель } from "../components/СтрокаИтога";
import { звук } from "../lib/sound";
import { useUser } from "../store/UserContext";
import { getGlobalRecord, Рекорд } from "../api/users";
import РекордыБлок from "../components/РекордыБлок";
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
  глобальный: Рекорд | null | "ошибка" | undefined; // undefined — ещё грузим
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
  const лимитВремени = (ключ: КлючСложности = свежее.current.сложность) => {
    if (КСЮХА_РАН.времяСессииСекунд <= 0 || КСЮХА_РАН.сложности[ключ].безТаймера) return 0;
    const u = свежее.current.user;
    return КСЮХА_РАН.времяСессииСекунд + (u ? бонусВремениСек(u) : 0);
  };

  if (!движок.current) {
    движок.current = new КсюхаРанДвижок(лимитВремени());
    движок.current.событие = (э) => звук.sfx(э); // звуки: прыжок, монета, поражение
  }

  /** Кнопка «Старт» в меню. */
  const старт = () => {
    движок.current!.сброс(лимитВремени(сложность), сложность);
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
      глобальный: undefined, причина: д.причина, сохранение: "идёт",
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
            предупреждение: Т.предупреждения.ksuha } : п));
        } catch (e2: any) {
          setИтог((п) => (п ? { ...п, сохранение: "ошибка", текстОшибки: e2.message } : п));
        }
      } else {
        setИтог((п) => (п ? { ...п, сохранение: "ошибка", текстОшибки: e?.message } : п));
      }
    }

    // Глобальный рекорд (если не получилось — покажем «—»)
    try {
      const г = await getGlobalRecord("best_ksuha_run");
      const мой = Math.max(n, прежний);
      // Если ваш результат выше (или базу не удалось обновить) — рекордсмен вы
      const рекордсмен: Рекорд | null =
        г && г.значение >= мой ? г : мой > 0 ? { telegram_id: u.telegram_id, nickname: u.nickname, значение: мой } : null;
      setИтог((п) => (п ? { ...п, глобальный: рекордсмен } : п));
    } catch {
      setИтог((п) => (п ? { ...п, глобальный: "ошибка" } : п));
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
  const лимит = лимитВремени(сложность);
  const бонусПроц = посчитатьНаграду(0, 0, "medium", user.salary_level).бонусПроц;
  const отступ = safeTop + 16;
  const ТК = Т.игры.ksuha;

  return (
    <div ref={контейнер} className="fixed inset-0 z-30 select-none overflow-hidden bg-black" style={{ touchAction: "none" }}>
      {/* Игровое поле на весь экран. Тап = прыжок */}
      <canvas ref={canvasRef} onPointerDown={прыжок} className="absolute inset-0 h-full w-full" />

      {/* ===== МЕНЮ ПЕРЕД СТАРТОМ ===== */}
      {фаза === "menu" && (
        <div className="absolute inset-0 flex flex-col items-center overflow-y-auto bg-black/60 px-5 pb-6" style={{ paddingTop: отступ }}>
          <button onClick={() => navigate("/games")} className="btn btn-ghost self-start !px-3 !py-2 text-sm">{Т.общее.назад}</button>

          <h2 className="mt-3 text-3xl font-bold text-brand-yellow">{ТК.заголовокМеню}</h2>
          <p className="mt-1 text-center text-sm text-white/70">{ТК.подсказка(КСЮХА_РАН.физика.максПрыжковПодряд > 1)}</p>

          <p className="mb-2 mt-4 text-sm font-bold text-white/80">{ТК.сложностьЗаголовок}</p>
          <div className="flex w-full max-w-sm flex-col gap-2">
            {(Object.keys(КСЮХА_РАН.сложности) as КлючСложности[]).map((ключ) => {
              const с = КСЮХА_РАН.сложности[ключ];
              const т = ТК.сложности[ключ];
              const выбрана = ключ === сложность;
              return (
                <button key={ключ} onClick={() => setСложность(ключ)} className={`opt flex items-center gap-3 p-3 text-left ${выбрана ? "opt-on" : ""}`}>
                  <span className="text-3xl">{т.значок}</span>
                  <span className="flex-1">
                    <span className="block font-bold">{т.название}</span>
                    <span className="block text-xs text-white/70">
                      {ТК.описаниеСложности(с.множительСкорости, с.множительРоста, с.безТаймера, с.множительНаграды)}
                    </span>
                  </span>
                  {выбрана && <span className="text-xl">✓</span>}
                </button>
              );
            })}
          </div>

          <button onClick={старт} className="btn btn-yellow mt-5 w-full max-w-sm !py-4 text-xl">{Т.общее.старт}</button>

          <p className="mt-4 text-center text-xs text-white/60">{ТК.условия(КСЮХА_РАН.препятствийЗаФишку, бонусПроц, лимит)}</p>
          <p className="mt-1 text-xs text-brand-yellow">{ТК.вашРекорд(user.best_ksuha_run ?? 0)}</p>
        </div>
      )}

      {/* ===== ОКНО РЕЗУЛЬТАТА ===== */}
      {фаза === "over" && итог && (
        <Модалка режим="absolute">
          <h3 className="mb-1 text-2xl font-bold">{итог.причина === "time" ? ТК.итог.времяВышло : ТК.итог.догнали}</h3>
          {итог.новыйРекорд && <p className="mb-1 font-bold text-brand-yellow">{Т.рекорды.новыйЛичный}</p>}

          <div className="stat-box my-3 p-3 text-left text-sm">
            <СтрокаИтога л={ТК.итог.препятствия} п={ТК.итог.препятствияЗнач(итог.препятствий, число(итог.награда.заПрепятствия))} />
            <СтрокаИтога л={ТК.итог.монеты} п={ТК.итог.монетыЗнач(итог.монет, число(итог.награда.заМонеты))} />
            {итог.награда.множитель !== 1 && <СтрокаИтога л={ТК.итог.сложность} п={`×${итог.награда.множитель}`} />}
            {итог.награда.бонусПроц > 0 && <СтрокаИтога л={Т.общее.бонусЗП} п={`+${итог.награда.бонусПроц}%`} />}
            <Разделитель />
            <СтрокаИтога л={Т.общее.получено} п={Т.общее.плюсФишки(итог.награда.итого)} />
          </div>

          <РекордыБлок личный={{ nickname: user.nickname, значение: итог.личныйРекорд }} глобальный={итог.глобальный} />

          {итог.сохранение === "идёт" && <p className="mb-2 text-xs text-white/50">{Т.общее.сохраняем}</p>}
          {итог.сохранение === "готово" && итог.награда.итого > 0 && !итог.предупреждение && (
            <p className="mb-2 text-xs text-green-300">{Т.общее.фишекЗачислено}</p>
          )}
          {итог.предупреждение && <p className="mb-2 text-xs text-orange-300">{итог.предупреждение}</p>}
          {итог.сохранение === "ошибка" && <p className="mb-2 text-xs text-red-300">{Т.общее.ошибкаСохранения(итог.текстОшибки)}</p>}

          <div className="flex gap-2">
            <button onClick={ещё} disabled={итог.сохранение === "идёт"} className="btn btn-blue flex-1">{Т.общее.игратьЕщё}</button>
            <button onClick={() => navigate("/games")} disabled={итог.сохранение === "идёт"} className="btn btn-yellow flex-1">{Т.общее.забратьИВыйти}</button>
          </div>
        </Модалка>
      )}
    </div>
  );
}

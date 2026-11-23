import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Т } from "../texts";
import Эм from "../components/Emoji";
import GameMenu from "../components/GameMenu";
import GameResult from "../components/GameResult";
import { звук } from "../lib/sound";
import { стат } from "../lib/stats";
import { useUser } from "../store/UserContext";
import { useMastery, сБонусом } from "../lib/useMastery";
import { getGlobalRecord, Рекорд } from "../api/users";
import { КСЮХА_РАН, КлючСложности } from "../config";
import { бонусВремениСек } from "../game/effects";
import { КсюхаРанДвижок, Фаза, посчитатьНаграду } from "../game/ksuhaRun";
import { навыкиИгры, открытыеНавыки } from "../game/skills";
import { getSafeTop } from "../lib/telegram";

// Что показываем в окне результата
interface Итог {
  база: number;
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
  const { бонус, мастерство, начатьЗабег, шкала, начислить: начислитьМастерство } = useMastery("ksuha");
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
    стат("plays_ksuha");
    движок.current!.навыки = new Set(открытыеНавыки("ksuha", мастерство.уровень).map((н) => н.id));
    движок.current!.сброс(лимитВремени(сложность), сложность);
    setИтог(null);
    начатьЗабег();
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
    const сырая = посчитатьНаграду(n, д.суммаМонет, сл, u.salary_level);
    const награда = сБонусом(сырая, бонус);
    const прежний = u.best_ksuha_run ?? 0;
    const новыйРекорд = n > прежний;

    setИтог({
      препятствий: n, монет: д.монетСобрано, награда, база: (сырая.заПрепятствия + сырая.заМонеты) * сырая.множитель,
      личныйРекорд: Math.max(n, прежний), новыйРекорд,
      глобальный: undefined, причина: д.причина, сохранение: "идёт",
    });

    const нужноСохранять = награда.итого > 0 || новыйРекорд;
    try {
      начислитьМастерство(награда.итого);
      if (нужноСохранять) await изменить({ chips: награда.итого }, новыйРекорд ? { best_ksuha_run: n } : {});
      setИтог((п) => (п ? { ...п, сохранение: "готово" } : п));
    } catch (e: any) {
      if (новыйРекорд && String(e?.message).includes("best_ksuha_run")) {
        // В базе ещё нет колонки рекорда — хотя бы зачисляем фишки
        try {
          начислитьМастерство(награда.итого);
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

  // Telegram: без «свайпа вниз», учёт отступов под кнопки Telegram
  useEffect(() => {
    const w = window.Telegram?.WebApp;
    try { w?.disableVerticalSwipes?.(); } catch {}
    const обновить = () => setSafeTop(getSafeTop());
    const события = ["safeAreaChanged", "contentSafeAreaChanged"];
    события.forEach((e) => w?.onEvent?.(e, обновить));
    return () => {
      события.forEach((e) => w?.offEvent?.(e, обновить));
      try { w?.enableVerticalSwipes?.(); } catch {}
    };
  }, []);

  const [худ, setХуд] = useState({ пройдено: 0, монеты: 0, осталось: 0, лимит: 0 });
  useEffect(() => {
    const id = setInterval(() => {
      const д = движок.current;
      if (!д || фазаRef.current !== "playing") return;
      setХуд({ пройдено: д.пройдено, монеты: д.монетСобрано, осталось: Math.ceil(д.осталось), лимит: д.лимит });
    }, 100);
    return () => clearInterval(id);
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

      {фаза === "playing" && (
        <div className="pointer-events-none absolute inset-x-0 z-10 flex flex-col items-center text-center" style={{ top: safeTop + 44 }}>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-white/55">Препятствий</div>
          <div className="text-4xl font-extrabold leading-none text-white drop-shadow">{худ.пройдено}</div>
          <div className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-white">
            <img src="/assets/icons/slot-chip.png" alt="" className="h-5 w-5" style={{ filter: "drop-shadow(0 0 6px rgba(255,255,255,0.9))" }} />
            {худ.монеты}
          </div>
          {худ.лимит > 0 && (
            <div className="mt-1 text-sm font-bold tabular-nums text-white/80">
              {Math.floor(худ.осталось / 60)}:{String(худ.осталось % 60).padStart(2, "0")}
            </div>
          )}
        </div>
      )}

      {/* ===== МЕНЮ ПЕРЕД СТАРТОМ ===== */}
      {фаза === "menu" && (
        <GameMenu
          колонка="best_ksuha_run"
          название={Т.игры.ksuha.название}
          мастерство={мастерство}
          навыки={навыкиИгры("ksuha")}
          сложности={(Object.keys(КСЮХА_РАН.сложности) as КлючСложности[]).map((к) => ({
            id: к,
            название: `${ТК.сложности[к].значок} ${ТК.сложности[к].название}`,
            множитель: КСЮХА_РАН.сложности[к].множительНаграды,
          }))}
          выбрана={сложность}
          onВыбор={(id) => setСложность(id as КлючСложности)}
          onСтарт={старт}
          onНазад={() => navigate("/games")}
        />
      )}

      {/* ===== ОКНО РЕЗУЛЬТАТА ===== */}
      {фаза === "over" && итог && (
        <GameResult
          заголовок={итог.причина === "time" ? ТК.итог.времяВышло : ТК.итог.догнали}
          база={итог.база}
          прокачкаПроц={итог.награда.бонусПроц}
          мастерство={мастерство} шкала={шкала}
          итог={итог.награда.итого}
          прогресс={{ подпись: "Препятствий", значение: String(итог.препятствий) }}
          лучший={итог.личныйРекорд}
          лучшийПодпись="Лучший"
          колонка="best_ksuha_run"
          ошибка={итог.сохранение === "ошибка" ? Т.общее.ошибкаСохранения(итог.текстОшибки) : undefined}
          предупреждение={итог.сохранение === "идёт" ? Т.общее.сохраняем : итог.предупреждение}
          основная={{ подпись: Т.общее.игратьЕщё, disabled: итог.сохранение === "идёт", onClick: старт }}
          вторичная={{ подпись: Т.общее.кСпискуИгр, disabled: итог.сохранение === "идёт", onClick: () => navigate("/games") }}
        />
      )}

    </div>
  );
}

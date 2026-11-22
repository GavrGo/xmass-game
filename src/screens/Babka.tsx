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
import { БАБКА_КРАШ as К, КлючПерсонажа } from "../config";
import { Рекорд } from "../api/users";
import { глобальныйРекорд } from "../game/records";
import { бонусВремениСек } from "../game/effects";
import { БабкаДвижок, ФазаБабки, РежимБабки, посчитатьНаградуБабки } from "../game/babka";
import { getSafeTop } from "../lib/telegram";
import { useNoSwipes } from "../lib/useNoSwipes";

interface Итог {
  дорог: number;
  награда: ReturnType<typeof посчитатьНаградуБабки>;
  база: number;
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
  const { бонус, мастерство, начислить: начислитьМастерство } = useMastery("babka");
  const navigate = useNavigate();
  useNoSwipes(); // только тапы

  const контейнер = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const движок = useRef<БабкаДвижок | null>(null);
  const фазаRef = useRef<ФазаБабки>("menu");
  const dpr = useRef(1);
  const [фаза, setФазаСтейт] = useState<ФазаБабки>("menu");
  const персонаж: КлючПерсонажа = "babka";
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

  const старт = () => {
    стат("plays_babka");
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
    const сырая = посчитатьНаградуБабки(n, р, п, u.salary_level);
    const награда = сБонусом(сырая, бонус);
    const прежний = u.best_babka_crash ?? 0;
    const новыйРекорд = n > прежний;
    const личный = Math.max(n, прежний);

    setИтог({ дорог: n, награда, база: сырая.сумма * сырая.режимМнож * сырая.персМнож, режим: р, персонаж: п, личный, глобальный: undefined, причина: д.причина, сохранение: "идёт" });

    try {
      начислитьМастерство(награда.итого);
      if (награда.итого > 0 || новыйРекорд) await изменить({ chips: награда.итого }, новыйРекорд ? { best_babka_crash: n } : {});
      setИтог((x) => (x ? { ...x, сохранение: "готово" } : x));
    } catch (e: any) {
      if (новыйРекорд && String(e?.message).includes("best_babka_crash")) {
        try {
          начислитьМастерство(награда.итого);
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
        <GameMenu
          колонка="best_babka_crash"
          заголовокВыбора={ТБ.режимЗаголовок}
          мастерство={мастерство}
          сложности={[
            { id: "timed", название: Т.общее.обычный, подпись: ТБ.режимОбычный(К.времяСек + бонусВрем, бонусВрем) },
            { id: "zen", название: Т.общее.дзен, подпись: ТБ.режимДзен(К.дзенМножитель), множитель: К.дзенМножитель },
          ]}
          выбрана={режим}
          onВыбор={(id) => setРежим(id as РежимБабки)}
          onСтарт={старт}
          onНазад={() => navigate("/games")}
        />
      )}

      {/* ===== РЕЗУЛЬТАТ ===== */}
      {фаза === "over" && итог && (
        <GameResult
          заголовок={итог.причина === "time" ? ТБ.итог.времяВышло : итог.персонаж === "babka" ? ТБ.итог.сбилаМашина : ТБ.итог.сбилиБабушку}
          база={итог.база}
          прокачкаПроц={итог.награда.бонусПроц}
          мастерство={мастерство}
          итог={итог.награда.итого}
          прогресс={{ подпись: "Дорог", значение: String(итог.дорог) }}
          лучший={итог.личный}
          лучшийПодпись="Лучший"
          колонка="best_babka_crash"
          ошибка={итог.сохранение === "ошибка" ? Т.общее.ошибкаСохранения(итог.текстОшибки) : undefined}
          предупреждение={итог.сохранение === "идёт" ? Т.общее.сохраняем : итог.предупреждение}
          основная={{
            подпись: Т.общее.игратьЕщё,
            disabled: итог.сохранение === "идёт",
            onClick: () => { setИтог(null); движок.current!.сброс(0, персонаж); setФаза("menu"); },
          }}
          вторичная={{ подпись: Т.общее.кСпискуИгр, onClick: () => navigate("/games") }}
        />
      )}

    </div>
  );
}

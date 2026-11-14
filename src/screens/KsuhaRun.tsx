import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../store/UserContext";
import { getGlobalBestKsuhaRun } from "../api/users";
import { КСЮХА_РАН } from "../config";
import { бонусВремениСек } from "../game/effects";
import { КсюхаРанДвижок, Фаза, ШИРИНА, ВЫСОТА, посчитатьНаграду } from "../game/ksuhaRun";

// Что показываем в окне результата
interface Итог {
  препятствий: number;
  награда: ReturnType<typeof посчитатьНаграду>;
  личныйРекорд: number;
  новыйРекорд: boolean;
  глобальныйРекорд: number | null;
  причина: "crash" | "time" | null;
  сохранение: "идёт" | "готово" | "ошибка";
  текстОшибки?: string;
}

export default function KsuhaRun() {
  const { user, change } = useUser();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const движок = useRef<КсюхаРанДвижок | null>(null);
  const фазаRef = useRef<Фаза>("ready");
  const [фаза, setФазаСтейт] = useState<Фаза>("ready");
  const [итог, setИтог] = useState<Итог | null>(null);

  // Всегда свежие данные игрока для функций, которые живут долго
  const свежее = useRef({ user, change });
  свежее.current = { user, change };

  const setФаза = (ф: Фаза) => { фазаRef.current = ф; setФазаСтейт(ф); };

  /** Лимит времени забега = базовое время + бонус прокачки «Сдвинуть сроки». */
  const лимитВремени = () => {
    if (КСЮХА_РАН.времяСессииСекунд <= 0) return 0;
    const u = свежее.current.user;
    return КСЮХА_РАН.времяСессииСекунд + (u ? бонусВремениСек(u) : 0);
  };

  if (!движок.current) движок.current = new КсюхаРанДвижок(лимитВремени());

  /** Забег закончился: считаем награду, сохраняем в Supabase, показываем окно. */
  const завершить = async () => {
    setФаза("over");
    const д = движок.current!;
    const { user: u, change: изменить } = свежее.current;
    if (!u) return;

    const n = д.пройдено;
    const награда = посчитатьНаграду(n, u.salary_level);
    const прежний = u.best_ksuha_run ?? 0;
    const новыйРекорд = n > прежний;

    setИтог({
      препятствий: n, награда, личныйРекорд: Math.max(n, прежний), новыйРекорд,
      глобальныйРекорд: null, причина: д.причина, сохранение: "идёт",
    });

    try {
      // Фишки и рекорд сохраняются одним действием (баланс сразу обновится везде)
      if (награда.итого > 0 || новыйРекорд) {
        await изменить({ chips: награда.итого }, новыйРекорд ? { best_ksuha_run: n } : {});
      }
      setИтог((п) => (п ? { ...п, сохранение: "готово" } : п));
    } catch (e: any) {
      setИтог((п) => (п ? { ...п, сохранение: "ошибка", текстОшибки: e.message } : п));
    }

    // Глобальный рекорд (если не получилось — просто не показываем)
    try {
      const г = await getGlobalBestKsuhaRun();
      setИтог((п) => (п ? { ...п, глобальныйРекорд: Math.max(г, n) } : п));
    } catch {}
  };
  const завершитьRef = useRef(завершить);
  завершитьRef.current = завершить;

  /** Тап / пробел: в начале — старт, во время игры — прыжок. */
  const действие = () => {
    if (фазаRef.current === "ready") {
      движок.current!.сброс(лимитВремени());
      setФаза("playing");
    } else if (фазаRef.current === "playing") {
      движок.current!.прыжок();
    }
  };
  const действиеRef = useRef(действие);
  действиеRef.current = действие;

  /** «Играть ещё» */
  const ещё = () => {
    движок.current!.сброс(лимитВремени());
    setИтог(null);
    setФаза("ready");
  };

  // Главный цикл игры (60 кадров в секунду)
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(2, 0, 0, 2, 0, 0); // canvas в 2 раза чётче
    let последний = performance.now();
    let raf = 0;
    const кадр = (сейчас: number) => {
      const dt = Math.min(0.05, (сейчас - последний) / 1000);
      последний = сейчас;
      const д = движок.current!;
      if (фазаRef.current === "playing") {
        д.обновить(dt);
        if (д.закончена) завершитьRef.current();
      }
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
        if (!e.repeat) действиеRef.current();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // В Telegram отключаем «свайп вниз закрывает игру», чтобы не мешал прыжкам
  useEffect(() => {
    const w = window.Telegram?.WebApp;
    w?.disableVerticalSwipes?.();
    return () => w?.enableVerticalSwipes?.();
  }, []);

  if (!user) return null;
  const лимит = лимитВремени();
  const бонусПроц = посчитатьНаграду(0, user.salary_level).бонусПроц;

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => navigate("/games")} className="rounded-xl bg-white/10 px-3 py-2 text-sm font-bold">← Назад</button>
        <h2 className="text-xl font-bold">Ksuha Run 🏃‍♀️</h2>
        <span className="text-sm text-white/60">🪙 {user.chips}</span>
      </div>

      <canvas
        ref={canvasRef}
        width={ШИРИНА * 2}
        height={ВЫСОТА * 2}
        onPointerDown={действие}
        className="w-full select-none rounded-2xl"
        style={{ touchAction: "none" }}
      />

      <p className="mt-3 text-center text-sm text-white/60">
        {КСЮХА_РАН.препятствийЗаФишку} препятствий = 1 🪙
        {бонусПроц > 0 && ` · бонус ЗП +${бонусПроц}%`}
        {лимит > 0 && ` · время: ${лимит} сек`}
      </p>
      <p className="mt-1 text-center text-xs text-white/40">
        Рекорд: {user.best_ksuha_run ?? 0}
        {КСЮХА_РАН.физика.максПрыжковПодряд > 1 && " · можно прыгать дважды"}
      </p>

      {/* Окно результата */}
      {фаза === "over" && итог && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/70 p-6">
          <div className="w-full max-w-sm rounded-3xl bg-xmas-dark p-5 text-center ring-2 ring-xmas-gold">
            <h3 className="mb-1 text-2xl font-bold">
              {итог.причина === "time" ? "⏱ Время вышло!" : "💥 Врезалась!"}
            </h3>
            {итог.новыйРекорд && <p className="mb-1 font-bold text-xmas-gold">🏆 Новый личный рекорд!</p>}

            <div className="my-3 rounded-2xl bg-white/10 p-3 text-left text-sm">
              <Строка л="Пройдено препятствий" п={String(итог.препятствий)} />
              <Строка
                л="Получено фишек"
                п={`+${итог.награда.итого} 🪙` +
                  (итог.награда.бонусФишек > 0 ? ` (с бонусом ЗП +${итог.награда.бонусФишек})` : "")}
              />
              <Строка л="Личный рекорд" п={String(итог.личныйРекорд)} />
              <Строка л="Рекорд среди всех" п={итог.глобальныйРекорд === null ? "…" : String(итог.глобальныйРекорд)} />
            </div>

            {итог.сохранение === "идёт" && <p className="mb-2 text-xs text-white/50">Сохраняем…</p>}
            {итог.сохранение === "готово" && итог.награда.итого > 0 && <p className="mb-2 text-xs text-green-400">Фишки зачислены на баланс</p>}
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

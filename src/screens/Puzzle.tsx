import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Т } from "../texts";
import Модалка from "../components/Модалка";
import СтрокаИтога, { Разделитель } from "../components/СтрокаИтога";
import { звук } from "../lib/sound";
import { useNoSwipes } from "../lib/useNoSwipes";
import { useUser } from "../store/UserContext";
import { ПЯТНАШКИ } from "../config";
import { бонусВремениСек } from "../game/effects";
import { перемешать, сдвинуть, собрана, наградаЗаПазл, ПУСТАЯ, Режим } from "../game/puzzle";
import { выбратьКартинку } from "../game/puzzleImages";
import { getPuzzleLeader, ЛидерПазлов } from "../api/users";
import РекордыБлок from "../components/РекордыБлок";

type Фаза = "menu" | "loading" | "playing" | "ending" | "won" | "lost";

interface Итог {
  победа: boolean;
  режим: Режим;
  награда: ReturnType<typeof наградаЗаПазл>;
  секунд: number;
  ходов: number;
  всего: number;                                  // сколько пазлов собрано всего (с этим)
  лидер: ЛидерПазлов | null | "ошибка" | undefined; // undefined — ещё грузим
  сохранение: "готово" | "ошибка";
  предупреждение?: string;
  текстОшибки?: string;
}

const N = ПЯТНАШКИ.размер;
const мм = (с: number) => `${Math.floor(с / 60)}:${String(с % 60).padStart(2, "0")}`;

export default function Puzzle() {
  const { user, change, telegramId } = useUser();
  const navigate = useNavigate();
  useNoSwipes(); // игра управляется только тапами

  const [фаза, setФаза] = useState<Фаза>("menu");
  const [режим, setРежим] = useState<Режим>("zen");
  const [доска, setДоска] = useState<number[]>([]);
  const [картинка, setКартинка] = useState("");
  const [ходов, setХодов] = useState(0);
  const [осталось, setОсталось] = useState(0);
  const [прошло, setПрошло] = useState(0);
  const [раскрыта, setРаскрыта] = useState(false);  // показать последнюю плитку после сборки
  const [номера, setНомера] = useState(false);
  const [подсказка, setПодсказка] = useState(false);
  const [итог, setИтог] = useState<Итог | null>(null);

  const началоRef = useRef(0);
  const конецRef = useRef(0);
  const ходовRef = useRef(0);
  const завершено = useRef(false);
  const прошлаяКартинка = useRef<string | null>(null);
  const свежее = useRef({ user, change, режим });
  свежее.current = { user, change, режим };

  /** Кнопка «Старт»: выбираем картинку, перемешиваем, запускаем таймер. */
  const старт = async () => {
    setФаза("loading");
    const src = await выбратьКартинку(прошлаяКартинка.current);
    прошлаяКартинка.current = src;
    setКартинка(src);
    setДоска(перемешать());
    setХодов(0); ходовRef.current = 0;
    setРаскрыта(false); setПодсказка(false); setИтог(null);

    const лимит = ПЯТНАШКИ.наВремя.времяСек + (user ? бонусВремениСек(user) : 0);
    const сейчас = Date.now();
    началоRef.current = сейчас;
    конецRef.current = сейчас + лимит * 1000;
    setОсталось(лимит); setПрошло(0);
    завершено.current = false;
    setФаза("playing");
  };

  /** Игра закончилась (победа или время вышло): награда, сохранение, окно результата. */
  const завершить = async (победа: boolean) => {
    if (завершено.current) return;
    завершено.current = true;
    const { user: u, change: изменить, режим: р } = свежее.current;
    if (!u) return;

    setФаза("ending");
    звук.sfx(победа ? "победа" : "поражение"); // ← звук победы / поражения
    if (победа) setРаскрыта(true);

    const награда = наградаЗаПазл(р, победа, u.salary_level);
    const секунд = Math.round((Date.now() - началоRef.current) / 1000);
    const всего = (u.puzzles_solved ?? 0) + (победа ? 1 : 0);

    let сохранение: Итог["сохранение"] = "готово";
    let предупреждение: string | undefined;
    let текстОшибки: string | undefined;
    try {
      if (награда.итого > 0 || победа) {
        await изменить({ chips: награда.итого }, победа ? { puzzles_solved: всего } : {});
      }
    } catch (e: any) {
      if (победа && String(e?.message).includes("puzzles_solved")) {
        // В базе нет колонки счётчика — хотя бы зачисляем фишки
        try {
          await изменить({ chips: награда.итого });
          предупреждение = Т.предупреждения.puzzle;
        } catch (e2: any) { сохранение = "ошибка"; текстОшибки = e2.message; }
      } else { сохранение = "ошибка"; текстОшибки = e?.message; }
    }

    await new Promise((r) => setTimeout(r, победа ? 900 : 300)); // дать увидеть собранную картинку
    setИтог({ победа, режим: р, награда, секунд, ходов: ходовRef.current, всего, лидер: undefined, сохранение, предупреждение, текстОшибки });
    setФаза(победа ? "won" : "lost");

    try {
      const л = await getPuzzleLeader();
      setИтог((п) => (п ? { ...п, лидер: л } : п));
    } catch {
      setИтог((п) => (п ? { ...п, лидер: "ошибка" } : п));
    }
  };
  const завершитьRef = useRef(завершить);
  завершитьRef.current = завершить;

  /** Нажатие на плитку. */
  const нажать = (позиция: number) => {
    if (фаза !== "playing") return;
    const новая = сдвинуть(доска, позиция);
    if (!новая) return;
    звук.sfx("ход"); // ← звук хода
    setДоска(новая);
    ходовRef.current += 1;
    setХодов(ходовRef.current);
    if (собрана(новая)) завершитьRef.current(true);
  };

  // Таймер
  useEffect(() => {
    if (фаза !== "playing") return;
    const t = setInterval(() => {
      const now = Date.now();
      setПрошло(Math.floor((now - началоRef.current) / 1000));
      if (свежее.current.режим === "timed") {
        const ост = Math.max(0, Math.ceil((конецRef.current - now) / 1000));
        setОсталось(ост);
        if (ост <= 0) завершитьRef.current(false);
      }
    }, 250);
    return () => clearInterval(t);
  }, [фаза]);

  const выйти = () => {
    if (фаза === "playing" && !confirm(Т.игры.пятнашки.выходПодтверждение)) return;
    navigate("/games");
  };

  if (!user) return null;
  const лимитТекст = ПЯТНАШКИ.наВремя.времяСек + бонусВремениСек(user);
  const плитки = Array.from({ length: N * N - 1 }, (_, t) => t);
  const стиль = (t: number) => ({
    backgroundImage: `url("${картинка}")`,
    backgroundSize: `${N * 100}% ${N * 100}%`,
    backgroundPosition: `${((t % N) / (N - 1)) * 100}% ${(Math.floor(t / N) / (N - 1)) * 100}%`,
  });
  const ТП = Т.игры.пятнашки;

  return (
    <div className="fixed inset-0 z-30 flex flex-col items-center overflow-y-auto bg-app px-4 pb-4 pt-3 select-none" style={{ touchAction: "manipulation" }}>
      {/* Шапка */}
      <div className="flex w-full max-w-md items-center justify-between">
        <button onClick={выйти} className="btn btn-ghost !px-3 !py-2 text-sm">{Т.общее.назад}</button>
        <h2 className="text-xl font-bold">{ТП.заголовокМеню}</h2>
        <div className={`pill min-w-[64px] px-3 py-2 text-center text-sm font-bold ${режим === "timed" && осталось <= 10 && фаза === "playing" ? "text-red-400" : ""}`}>
          {фаза === "menu" || фаза === "loading" ? "—" : режим === "timed" ? `⏱ ${мм(осталось)}` : `⏱ ${мм(прошло)}`}
        </div>
      </div>

      {/* Панель под шапкой */}
      <div className="mt-3 flex w-full max-w-md items-center justify-between text-sm text-white/70">
        <span>{ТП.ходов(ходов)}</span>
        <div className="flex gap-2">
          <button onClick={() => setНомера(!номера)} className={`btn !rounded-lg !px-3 !py-1 ${номера ? "btn-yellow" : "btn-ghost"}`}>{ТП.номера}</button>
          <button onClick={() => setПодсказка(!подсказка)} className={`btn !rounded-lg !px-3 !py-1 ${подсказка ? "btn-yellow" : "btn-ghost"}`}>{ТП.подсказкаКнопка}</button>
        </div>
      </div>

      {/* Поле */}
      <div className="relative mt-3" style={{ width: "min(92vw, calc(100dvh - 190px), 520px)", aspectRatio: "1 / 1" }}>
        <div className="absolute inset-0 overflow-hidden rounded-xl bg-black/50 ring-2 ring-brand-yellow/60">
          {картинка && доска.length > 0 && (
            <>
              {плитки.map((t) => {
                const поз = доска.indexOf(t);
                const r = Math.floor(поз / N), c = поз % N;
                return (
                  <div
                    key={t}
                    onClick={() => нажать(поз)}
                    className="absolute left-0 top-0 box-border cursor-pointer rounded-sm border border-black/40 active:brightness-125"
                    style={{
                      width: `${100 / N}%`, height: `${100 / N}%`,
                      transform: `translate(${c * 100}%, ${r * 100}%)`,
                      transition: `transform ${ПЯТНАШКИ.анимацияМс}ms ease-out`,
                      ...стиль(t),
                    }}
                  >
                    {номера && <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-xs font-bold">{t + 1}</span>}
                  </div>
                );
              })}
              {/* Последняя плитка: появляется, когда пазл собран */}
              <div
                className="pointer-events-none absolute left-0 top-0 box-border transition-opacity duration-700"
                style={{
                  width: `${100 / N}%`, height: `${100 / N}%`,
                  transform: `translate(${((доска.indexOf(ПУСТАЯ) % N) * 100)}%, ${Math.floor(доска.indexOf(ПУСТАЯ) / N) * 100}%)`,
                  opacity: раскрыта ? 1 : 0,
                  ...стиль(ПУСТАЯ),
                }}
              />
            </>
          )}
          {фаза === "loading" && <div className="absolute inset-0 flex items-center justify-center text-white/70">{ТП.готовим}</div>}
        </div>

        {/* Подсказка: уменьшенная картинка */}
        {подсказка && картинка && (
          <img src={картинка} alt="" className="pointer-events-none absolute right-2 top-2 w-1/3 rounded-lg opacity-95 ring-2 ring-white/70" />
        )}
      </div>

      {фаза === "playing" && <p className="mt-3 text-center text-xs text-white/50">{ТП.справка}</p>}

      {/* ===== МЕНЮ ===== */}
      {фаза === "menu" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 p-5">
          <h2 className="text-3xl font-bold text-brand-yellow">{ТП.заголовокМеню}</h2>
          <p className="mb-5 mt-1 text-center text-sm text-white/70">{ТП.подзаголовок}</p>
          <div className="flex w-full max-w-sm flex-col gap-2">
            <button onClick={() => setРежим("zen")} className={`opt p-4 text-left ${режим === "zen" ? "opt-on" : ""}`}>
              <div className="font-bold">{Т.общее.дзен}</div>
              <div className="text-xs text-white/70">{ТП.режимДзен(ПЯТНАШКИ.дзен.награда)}</div>
            </button>
            <button onClick={() => setРежим("timed")} className={`opt p-4 text-left ${режим === "timed" ? "opt-on" : ""}`}>
              <div className="font-bold">{Т.общее.наВремя}</div>
              <div className="text-xs text-white/70">{ТП.режимВремя(мм(лимитТекст), ПЯТНАШКИ.наВремя.наградаЗаСборку, ПЯТНАШКИ.наВремя.утешительнаяНаграда)}</div>
            </button>
          </div>
          <button onClick={старт} className="btn btn-yellow mt-5 w-full max-w-sm !py-4 text-xl">{Т.общее.старт}</button>
          <button onClick={() => navigate("/games")} className="mt-3 text-sm text-white/60">{Т.общее.кСпискуИгр}</button>
          <p className="mt-3 text-xs text-brand-yellow">{ТП.вашРекорд(user.puzzles_solved ?? 0)}</p>
        </div>
      )}

      {/* ===== РЕЗУЛЬТАТ ===== */}
      {(фаза === "won" || фаза === "lost") && итог && (
        <Модалка режим="absolute">
          <h3 className="mb-2 text-2xl font-bold">{итог.победа ? ТП.победа : ТП.времяВышло}</h3>

          <div className="stat-box my-3 p-3 text-left text-sm">
            <СтрокаИтога л={ТП.итог.режим} п={итог.режим === "zen" ? ТП.итог.дзен : ТП.итог.наВремя} />
            <СтрокаИтога л={ТП.итог.время} п={мм(итог.секунд)} />
            <СтрокаИтога л={ТП.итог.ходов} п={String(итог.ходов)} />
            {итог.награда.бонусПроц > 0 && итог.награда.итого > 0 && <СтрокаИтога л={Т.общее.бонусЗП} п={`+${итог.награда.бонусПроц}%`} />}
            <Разделитель />
            <СтрокаИтога л={Т.общее.получено} п={Т.общее.плюсФишки(итог.награда.итого)} />
          </div>

          <РекордыБлок личный={{ nickname: user.nickname, значение: итог.всего }} глобальный={глобальныйПазлов(итог, user.nickname)} />
          <p className="-mt-2 mb-2 text-[11px] text-white/50">{ТП.примечаниеРекорда}</p>

          {итог.предупреждение && <p className="mb-2 text-xs text-orange-300">{итог.предупреждение}</p>}
          {итог.сохранение === "ошибка" && <p className="mb-2 text-xs text-red-300">{Т.общее.ошибкаСохранения(итог.текстОшибки)}</p>}

          <div className="flex gap-2">
            <button onClick={() => { setИтог(null); setФаза("menu"); }} className="btn btn-blue flex-1">{Т.общее.игратьЕщё}</button>
            <button onClick={() => navigate("/games")} className="btn btn-yellow flex-1">{Т.общее.забратьИВыйти}</button>
          </div>
        </Модалка>
      )}
    </div>
  );
}

/** Глобальный рекорд пазлов для единого блока: рекордсмен — лидер из базы или вы, если у вас не меньше. */
function глобальныйПазлов(итог: Итог, мойНик: string): { nickname: string; значение: number } | null | "ошибка" | undefined {
  const л = итог.лидер;
  if (л === undefined || л === "ошибка") return л;
  if (!л || итог.всего >= л.count) return итог.всего > 0 ? { nickname: мойНик, значение: итог.всего } : null;
  return { nickname: л.nickname, значение: л.count };
}

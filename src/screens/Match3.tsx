import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../store/UserContext";
import { ТРИ_В_РЯД as К } from "../config";
import { getGlobalRecord, Рекорд } from "../api/users";
import РекордыБлок from "../components/РекордыБлок";
import {
  N, Поле, соседи, поменять, найтиСерии, разрушения, упасть, естьХод, начальноеПоле, перемешатьПоле,
  очкиЗаШаг, цельЭтапа, ходовЭтапа, наградаЭтапа, ТЕКСТ_ЭФФЕКТА,
} from "../game/match3";

type Фаза = "menu" | "playing" | "stage" | "over";

interface ДанныеЭтапа {
  этап: number;
  награда: ReturnType<typeof наградаЭтапа>;
  сохранилось: boolean;
  предупреждение?: string;
}
interface Итог {
  причина: "ходы" | "выход";
  пройдено: number;
  фишек: number;
  личный: number;
  глобальный: Рекорд | null | "ошибка" | undefined;
}

const пауза = (мс: number) => new Promise<void>((r) => setTimeout(r, мс));
const кадр = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

export default function Match3() {
  const { user, change } = useUser();
  const navigate = useNavigate();

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
  const [фото, setФото] = useState<Record<string, boolean>>({});
  const [готово, setГотово] = useState(false);
  const [данныеЭтапа, setДанныеЭтапа] = useState<ДанныеЭтапа | null>(null);
  const [итог, setИтог] = useState<Итог | null>(null);

  const доскаRef = useRef<HTMLDivElement>(null);
  const полеRef = useRef<Поле>([]);
  const очкиRef = useRef(0);
  const ходыRef = useRef(0);
  const цельRef = useRef(0);
  const этапRef = useRef(1);
  const занято = useRef(false);
  const нажатие = useRef<{ idx: number; x: number; y: number } | null>(null);
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

  /** Новый этап (n = 1, 2, 3 ...). */
  const начатьЭтап = (n: number) => {
    этапRef.current = n; setЭтап(n);
    цельRef.current = цельЭтапа(n); setЦель(цельRef.current);
    ходыRef.current = ходовЭтапа(n); setХоды(ходыRef.current);
    очкиRef.current = 0; setОчки(0);
    const п = начальноеПоле();
    полеRef.current = п; setПоле(п);
    setНовые(new Set()); setУдаляются(new Set()); setВыбранная(null);
    setДанныеЭтапа(null);
    setФаза("playing");
  };

  const старт = () => {
    сессия.current = { пройдено: 0, фишек: 0 };
    setИтог(null);
    начатьЭтап(1);
  };

  /** Игра окончена (ходы закончились или игрок вышел). */
  const завершить = async (причина: Итог["причина"]) => {
    const u = свежее.current.user;
    if (!u) return;
    const пройдено = сессия.current.пройдено;
    const личный = Math.max(u.best_match3_stage ?? 0, пройдено);
    setИтог({ причина, пройдено, фишек: сессия.current.фишек, личный, глобальный: undefined });
    setФаза("over");
    try {
      const г = await getGlobalRecord("best_match3_stage");
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
    const награда = наградаЭтапа(н, ходыRef.current, u.salary_level);
    const рекорд = u.best_match3_stage ?? 0;
    let сохранилось = true;
    let предупреждение: string | undefined;
    try {
      await изменить({ chips: награда.итого }, н > рекорд ? { best_match3_stage: н } : {});
    } catch (e: any) {
      if (н > рекорд && String(e?.message).includes("best_match3_stage")) {
        try {
          await изменить({ chips: награда.итого });
          предупреждение = "Фишки зачислены, но рекорд не сохранён: выполните SQL из migrations/004_match3.sql";
        } catch { сохранилось = false; }
      } else { сохранилось = false; }
    }
    if (сохранилось) сессия.current.фишек += награда.итого;
    сессия.current.пройдено = н;
    setДанныеЭтапа({ этап: н, награда, сохранилось, предупреждение });
    setФаза("stage");
  };

  /** Ход игрока: обмен двух соседних клеток и вся цепочка последствий. */
  const сделатьХод = async (a: number, b: number) => {
    if (занято.current || фаза !== "playing" || !соседи(a, b)) return;
    занято.current = true;
    setВыбранная(null);
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

      let каскад = 1;
      let центры = [a, b];
      while (серии.length) {
        const р = разрушения(п, серии, центры);
        центры = [];
        очкиRef.current += очкиЗаШаг(р.индексы.size, каскад);
        setОчки(очкиRef.current);
        if (р.эффект) показатьТост(ТЕКСТ_ЭФФЕКТА[р.эффект]);
        else if (каскад > 1) показатьТост(`Каскад ×${каскад}!`);

        setУдаляются(new Set([...р.индексы].map((i) => п[i]!.id)));
        await пауза(240);

        const после = [...п];
        р.индексы.forEach((i) => { после[i] = null; });
        const г = упасть(после);
        п = г.поле;
        полеRef.current = п;
        setУдаляются(new Set());
        setНовые(г.новые);
        setПоле(п);
        await кадр();
        setНовые(new Set());
        await пауза(К.анимацияМс + 60);

        серии = найтиСерии(п);
        каскад++;
      }

      if (!естьХод(п)) {
        показатьТост("Нет ходов — перемешиваем");
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

  // ---------- Нажатия и свайпы по полю ----------
  const индексПоТочке = (x: number, y: number): number => {
    const el = доскаRef.current;
    if (!el) return -1;
    const р = el.getBoundingClientRect();
    const c = Math.floor(((x - р.left) / р.width) * N), r = Math.floor(((y - р.top) / р.height) * N);
    return c < 0 || c >= N || r < 0 || r >= N ? -1 : r * N + c;
  };
  const нажали = (e: React.PointerEvent) => {
    if (фаза !== "playing" || занято.current) return;
    const idx = индексПоТочке(e.clientX, e.clientY);
    if (idx < 0) return;
    нажатие.current = { idx, x: e.clientX, y: e.clientY };
  };
  const отпустили = (e: React.PointerEvent) => {
    const н = нажатие.current;
    нажатие.current = null;
    if (!н || фаза !== "playing" || занято.current) return;
    const dx = e.clientX - н.x, dy = e.clientY - н.y;
    if (Math.hypot(dx, dy) > 18) {
      // Свайп: двигаем символ в сторону свайпа
      const шаг = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : -1) : dy > 0 ? N : -N;
      const цельИдx = н.idx + шаг;
      if (цельИдx >= 0 && цельИдx < N * N && соседи(н.idx, цельИдx)) сделатьХод(н.idx, цельИдx);
    } else if (выбранная === null) {
      setВыбранная(н.idx);
    } else if (выбранная === н.idx) {
      setВыбранная(null);
    } else if (соседи(выбранная, н.idx)) {
      сделатьХод(выбранная, н.idx);
    } else {
      setВыбранная(н.idx);
    }
  };

  const выйти = () => {
    if (занято.current) return;
    if (фаза === "playing") {
      if (!confirm("Выйти из игры? Награда за текущий этап не начислится (за пройденные этапы — уже начислена).")) return;
      завершить("выход");
    } else {
      navigate("/games");
    }
  };

  if (!user) return null;
  const доля = цель > 0 ? Math.min(100, (очки / цель) * 100) : 0;
  const следующий = данныеЭтапа ? данныеЭтапа.этап + 1 : 2;

  return (
    <div className="fixed inset-0 z-30 flex flex-col items-center overflow-y-auto bg-xmas-dark px-4 pb-4 pt-3 select-none" style={{ touchAction: "none" }}>
      {/* Шапка */}
      <div className="flex w-full max-w-md items-center justify-between">
        <button onClick={выйти} className="rounded-xl bg-white/10 px-3 py-2 text-sm font-bold">← {фаза === "playing" ? "Выйти" : "Назад"}</button>
        <h2 className="text-xl font-bold">3 в ряд 🍬</h2>
        <div className="min-w-[72px] rounded-xl bg-white/10 px-3 py-2 text-center text-sm font-bold">{фаза === "menu" ? "—" : `Этап ${этап}`}</div>
      </div>

      {/* Очки и ходы */}
      <div className="mt-3 w-full max-w-md">
        <div className="flex justify-between text-sm text-white/80">
          <span>Очки: <b>{очки}</b> / {цель}</span>
          <span>Ходов: <b className={ходы <= 3 && фаза === "playing" ? "text-red-400" : ""}>{ходы}</b></span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-xmas-gold transition-all duration-300" style={{ width: `${доля}%` }} />
        </div>
      </div>

      {/* Поле */}
      <div className="relative mt-3" style={{ width: "min(92vw, calc(100dvh - 190px), 520px)", aspectRatio: "1 / 1" }}>
        <div
          ref={доскаRef}
          onPointerDown={нажали}
          onPointerUp={отпустили}
          onPointerCancel={() => { нажатие.current = null; }}
          className="absolute inset-0 overflow-hidden rounded-xl bg-black/40 ring-2 ring-xmas-gold/60"
        >
          {поле.map((к, i) => {
            if (!к) return null;
            const r = Math.floor(i / N), c = i % N;
            const новая = новые.has(к.id);
            const удал = удаляются.has(к.id);
            const выбрана = выбранная === i;
            const сим = К.символы[к.тип];
            return (
              <div
                key={к.id}
                className="pointer-events-none absolute left-0 top-0"
                style={{
                  width: `${100 / N}%`, height: `${100 / N}%`,
                  transform: `translate(${c * 100}%, ${(новая ? r - N : r) * 100}%)`,
                  transition: новая ? "none" : `transform ${К.анимацияМс}ms ease-in-out`,
                  zIndex: выбрана ? 2 : 1,
                }}
              >
                <div className={`h-full w-full p-[4%] transition-all duration-200 ${удал ? "scale-0 opacity-0" : ""} ${выбрана ? "scale-110" : ""}`}>
                  <div className={`flex h-full w-full items-center justify-center rounded-lg ${выбрана ? "bg-white/30 ring-2 ring-xmas-gold" : "bg-white/10"}`}>
                    {фото[сим.id] ? (
                      <img src={К.папка + сим.файл} alt="" draggable={false} className="h-[84%] w-[84%] object-contain" />
                    ) : (
                      <span style={{ fontSize: "clamp(18px, 6.2vw, 36px)", lineHeight: 1 }}>{сим.эмодзи}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {тост && (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center">
            <span className="inline-block rounded-2xl bg-black/75 px-4 py-2 text-lg font-bold text-xmas-gold ring-2 ring-xmas-gold">{тост}</span>
          </div>
        )}
      </div>

      {фаза === "playing" && (
        <p className="mt-3 text-center text-xs text-white/50">Тапните два соседних символа или смахните символ в сторону</p>
      )}

      {/* ===== МЕНЮ ===== */}
      {фаза === "menu" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center overflow-y-auto bg-black/85 p-5">
          <h2 className="text-3xl font-bold text-xmas-gold">3 в ряд 🍬</h2>
          <p className="mt-2 max-w-sm text-center text-sm text-white/70">
            Меняйте соседние символы местами. Наберите очки до конца ходов — и переходите на следующий этап. Чем дальше этап, тем больше фишек.
          </p>
          <div className="mt-3 w-full max-w-sm rounded-2xl bg-white/10 p-3 text-xs text-white/80">
            <div>3 в ряд — символы исчезают</div>
            <div>4 в ряд — 💥 взрыв вокруг ({К.радиусВзрыва * 2 + 1}×{К.радиусВзрыва * 2 + 1})</div>
            <div>5 в ряд — ⚡ вся линия</div>
            <div>6 в ряд — 🌈 все символы этого вида</div>
            <div>{К.ультиматумОтДлины}+ в ряд — 🌟 всё поле</div>
          </div>
          <p className="mt-3 text-sm text-white/70">
            Этап 1: {цельЭтапа(1)} очков за {ходовЭтапа(1)} ходов · награда {К.награда.старт} 🪙
          </p>
          <button
            onClick={старт}
            disabled={!готово}
            className="mt-4 w-full max-w-sm rounded-2xl bg-xmas-red py-4 text-xl font-bold active:scale-95 disabled:bg-gray-600 disabled:text-white/40"
          >
            {готово ? "▶ Старт" : "Загрузка…"}
          </button>
          <button onClick={() => navigate("/games")} className="mt-3 text-sm text-white/60">← К списку игр</button>
          <p className="mt-3 text-xs text-xmas-gold">Ваш рекорд: этапов {user.best_match3_stage ?? 0}</p>
        </div>
      )}

      {/* ===== ЭТАП ПРОЙДЕН ===== */}
      {фаза === "stage" && данныеЭтапа && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/75 p-5">
          <div className="w-full max-w-sm rounded-3xl bg-xmas-dark p-5 text-center ring-2 ring-xmas-gold">
            <h3 className="mb-2 text-2xl font-bold">🎉 Этап {данныеЭтапа.этап} пройден!</h3>
            <div className="my-3 rounded-2xl bg-white/10 p-3 text-left text-sm">
              <Строка л="Награда этапа" п={`${данныеЭтапа.награда.база} 🪙`} />
              {данныеЭтапа.награда.заХоды > 0 && <Строка л="Бонус за оставшиеся ходы" п={`+${данныеЭтапа.награда.заХоды} 🪙`} />}
              {данныеЭтапа.награда.бонусПроц > 0 && <Строка л="Бонус «Повышение ЗП»" п={`+${данныеЭтапа.награда.бонусПроц}%`} />}
              <div className="my-1 border-t border-white/10" />
              <Строка л="Получено фишек" п={`+${данныеЭтапа.награда.итого} 🪙`} />
            </div>
            {!данныеЭтапа.сохранилось && <p className="mb-2 text-xs text-red-400">Не удалось сохранить награду</p>}
            {данныеЭтапа.предупреждение && <p className="mb-2 text-xs text-orange-300">{данныеЭтапа.предупреждение}</p>}
            <p className="mb-3 text-xs text-white/60">
              Дальше: этап {следующий} — {цельЭтапа(следующий)} очков за {ходовЭтапа(следующий)} ходов, награда {К.награда.старт + К.награда.прирост * (следующий - 1)} 🪙
            </p>
            <div className="flex gap-2">
              <button onClick={() => начатьЭтап(следующий)} className="flex-1 rounded-xl bg-xmas-green py-3 font-bold">Дальше ▶</button>
              <button onClick={() => завершить("выход")} className="flex-1 rounded-xl bg-xmas-red py-3 font-bold">Забрать и выйти</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== ИТОГ ИГРЫ ===== */}
      {фаза === "over" && итог && (
        <div className="absolute inset-0 z-10 flex items-center justify-center overflow-y-auto bg-black/75 p-5">
          <div className="w-full max-w-sm rounded-3xl bg-xmas-dark p-5 text-center ring-2 ring-xmas-gold">
            <h3 className="mb-2 text-2xl font-bold">{итог.причина === "ходы" ? "😵 Ходы закончились" : "👋 Игра завершена"}</h3>
            <div className="my-3 rounded-2xl bg-white/10 p-3 text-left text-sm">
              <Строка л="Этапов пройдено" п={String(итог.пройдено)} />
              <Строка л="Получено фишек" п={`+${итог.фишек} 🪙`} />
            </div>
            <РекордыБлок личный={{ nickname: user.nickname, значение: итог.личный }} глобальный={итог.глобальный} />
            <div className="flex gap-2">
              <button onClick={() => { setИтог(null); setФаза("menu"); }} className="flex-1 rounded-xl bg-xmas-green py-3 font-bold">Играть ещё</button>
              <button onClick={() => navigate("/games")} className="flex-1 rounded-xl bg-xmas-red py-3 font-bold">Забрать и выйти</button>
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

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Т } from "../texts";
import Модалка from "../components/Модалка";
import СтрокаИтога, { Разделитель } from "../components/СтрокаИтога";
import { звук } from "../lib/sound";
import { useNoSwipes } from "../lib/useNoSwipes";
import { useUser } from "../store/UserContext";
import { ТРИ_В_РЯД as К } from "../config";
import { getGlobalRecord, Рекорд } from "../api/users";
import РекордыБлок from "../components/РекордыБлок";
import { глобальныйРекорд } from "../game/records";
import ВспышкиCanvas, { Вспышка } from "../components/ВспышкиCanvas";
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
    const r = Math.floor(центр / N), c = центр % N;
    setВспышки((в) => [...в, { id, x: (c + 0.5) / N, y: (r + 0.5) / N, радиус: (К.радиусВзрыва + 1.4) / N, старт: performance.now() }]);
    setTimeout(() => setВспышки((в) => в.filter((x) => x.id !== id)), 700);
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
    const награда = наградаЭтапа(н, ходыRef.current, u.salary_level);
    const рекорд = u.best_match3 ?? 0;
    let сохранилось = true;
    let предупреждение: string | undefined;
    try {
      await изменить({ chips: награда.итого }, н > рекорд ? { best_match3: н } : {});
    } catch (e: any) {
      if (н > рекорд && String(e?.message).includes("best_match3")) {
        try {
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
        очкиRef.current += очкиЗаШаг(р.индексы.size, каскад);
        setОчки(очкиRef.current);
        // Взрыв (4 в ряд) показываем вспышкой, остальные эффекты — надписью
        if (р.взрывы.length) звук.sfx("взрыв"); // ← звук взрыва
        р.взрывы.forEach(добавитьВспышку);
        if (р.эффект && р.эффект !== "взрыв") показатьТост(ТЕКСТ_ЭФФЕКТА[р.эффект]);
        else if (каскад > 1) показатьТост(Т.игры.три_в_ряд.каскад(каскад));

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
    const c = Math.floor(((x - р.left) / р.width) * N), r = Math.floor(((y - р.top) / р.height) * N);
    return c < 0 || c >= N || r < 0 || r >= N ? -1 : r * N + c;
  };
  const нажатьКлетку = (e: React.MouseEvent) => {
    if (фаза !== "playing" || занято.current) return;
    const idx = индексПоТочке(e.clientX, e.clientY);
    if (idx < 0) return;
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

  if (!user) return null;
  const доля = цель > 0 ? Math.min(100, (очки / цель) * 100) : 0;
  const следующий = данныеЭтапа ? данныеЭтапа.этап + 1 : 2;
  const ТМ = Т.игры.три_в_ряд;
  const размерВзрыва = `${К.радиусВзрыва * 2 + 1}×${К.радиусВзрыва * 2 + 1}`;

  return (
    <div className="fixed inset-0 z-30 flex flex-col items-center overflow-y-auto bg-app px-4 pb-4 pt-3 select-none" style={{ touchAction: "manipulation" }}>
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
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-brand-yellow transition-all duration-300" style={{ width: `${доля}%` }} />
        </div>
      </div>

      {/* Поле */}
      <div className="relative mt-3" style={{ width: "min(92vw, calc(100dvh - 190px), 520px)", aspectRatio: "1 / 1" }}>
        <div
          ref={доскаRef}
          onClick={нажатьКлетку}
          className="absolute inset-0 isolate overflow-hidden rounded-xl bg-black/40 ring-2 ring-brand-yellow/60"
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
                  <div className={`flex h-full w-full items-center justify-center rounded-lg ${выбрана ? "bg-white/30 ring-2 ring-brand-yellow" : "bg-white/10"}`}>
                    {фото[сим.id] ? (
                      <img src={К.папка + сим.файл} alt="" draggable={false} className="h-[84%] w-[84%] object-contain" style={idle(к.id)} />
                    ) : (
                      <span className="inline-block" style={{ fontSize: "clamp(18px, 6.2vw, 36px)", lineHeight: 1, ...idle(к.id) }}>{сим.эмодзи}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <ВспышкиCanvas вспышки={вспышки} />

        {тост && (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 z-20 -translate-y-1/2 text-center">
            <span className="inline-block rounded-2xl bg-black/75 px-4 py-2 text-lg font-bold text-brand-yellow ring-2 ring-brand-yellow">{тост}</span>
          </div>
        )}
      </div>

      {фаза === "playing" && <p className="mt-3 text-center text-xs text-white/50">{ТМ.справка}</p>}

      {/* ===== МЕНЮ ===== */}
      {фаза === "menu" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center overflow-y-auto bg-black/85 p-5">
          <h2 className="text-3xl font-bold text-brand-yellow">{ТМ.заголовокМеню}</h2>
          <p className="mt-2 max-w-sm text-center text-sm text-white/70">{ТМ.описаниеИгры}</p>
          <div className="stat-box mt-3 w-full max-w-sm p-3 text-xs text-white/80">
            <div>{ТМ.правила.три}</div>
            <div>{ТМ.правила.четыре(размерВзрыва)}</div>
            <div>{ТМ.правила.пять}</div>
            <div>{ТМ.правила.шесть}</div>
            <div>{ТМ.правила.много(К.ультиматумОтДлины)}</div>
          </div>
          <p className="mt-3 text-sm text-white/70">{ТМ.этапПервый(цельЭтапа(1), ходовЭтапа(1), К.награда.старт)}</p>
          <button onClick={старт} disabled={!готово} className="btn btn-yellow mt-4 w-full max-w-sm !py-4 text-xl">
            {готово ? Т.общее.старт : Т.общее.загрузка}
          </button>
          <button onClick={() => navigate("/games")} className="mt-3 text-sm text-white/60">{Т.общее.кСпискуИгр}</button>
          <p className="mt-3 text-xs text-brand-yellow">{ТМ.вашРекорд(user.best_match3 ?? 0)}</p>
        </div>
      )}

      {/* ===== ЭТАП ПРОЙДЕН ===== */}
      {фаза === "stage" && данныеЭтапа && (
        <Модалка режим="absolute">
          <h3 className="mb-2 text-2xl font-bold">{ТМ.этапПройден(данныеЭтапа.этап)}</h3>
          <div className="stat-box my-3 p-3 text-left text-sm">
            <СтрокаИтога л={ТМ.наградаЭтапа} п={Т.общее.фишки(данныеЭтапа.награда.база)} />
            {данныеЭтапа.награда.заХоды > 0 && <СтрокаИтога л={ТМ.бонусЗаХоды} п={Т.общее.плюсФишки(данныеЭтапа.награда.заХоды)} />}
            {данныеЭтапа.награда.бонусПроц > 0 && <СтрокаИтога л={Т.общее.бонусЗП} п={`+${данныеЭтапа.награда.бонусПроц}%`} />}
            <Разделитель />
            <СтрокаИтога л={Т.общее.получено} п={Т.общее.плюсФишки(данныеЭтапа.награда.итого)} />
          </div>
          <РекордыБлок личный={{ nickname: user.nickname, значение: данныеЭтапа.личный }} глобальный={данныеЭтапа.глобальный} />
          {!данныеЭтапа.сохранилось && <p className="mb-2 text-xs text-red-300">{ТМ.ошибкаНаграды}</p>}
          {данныеЭтапа.предупреждение && <p className="mb-2 text-xs text-orange-300">{данныеЭтапа.предупреждение}</p>}
          <p className="mb-3 text-xs text-white/60">
            {ТМ.дальнейший(следующий, цельЭтапа(следующий), ходовЭтапа(следующий), К.награда.старт + К.награда.прирост * (следующий - 1))}
          </p>
          <div className="flex gap-2">
            <button onClick={() => начатьЭтап(следующий)} className="btn btn-blue flex-1">{Т.общее.дальше}</button>
            <button onClick={() => завершить("выход")} className="btn btn-yellow flex-1">{Т.общее.забратьИВыйти}</button>
          </div>
        </Модалка>
      )}

      {/* ===== ИТОГ ИГРЫ ===== */}
      {фаза === "over" && итог && (
        <Модалка режим="absolute">
          <h3 className="mb-2 text-2xl font-bold">{итог.причина === "ходы" ? ТМ.ходыЗакончились : ТМ.играЗавершена}</h3>
          <div className="stat-box my-3 p-3 text-left text-sm">
            <СтрокаИтога л={ТМ.этаповПройдено} п={String(итог.пройдено)} />
            <СтрокаИтога л={Т.общее.получено} п={Т.общее.плюсФишки(итог.фишек)} />
          </div>
          <РекордыБлок личный={{ nickname: user.nickname, значение: итог.личный }} глобальный={итог.глобальный} />
          <div className="flex gap-2">
            <button onClick={() => { setИтог(null); setФаза("menu"); }} className="btn btn-blue flex-1">{Т.общее.игратьЕщё}</button>
            <button onClick={() => navigate("/games")} className="btn btn-yellow flex-1">{Т.общее.забратьИВыйти}</button>
          </div>
        </Модалка>
      )}
    </div>
  );
}

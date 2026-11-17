import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useUser } from "../store/UserContext";
import SlotReels from "../components/SlotReels";
import КнопкаСпин from "../components/КнопкаСпин";
import КолесоФортуны from "../components/КолесоФортуны";
import { Конфетти, Взрыв } from "../components/SlotEffects";
import { Иконка, Картинка } from "../components/Иконка";
import { СИМВОЛЫ_СЛОТА, СЛОТ, АССЕТЫ, АВТОМАТ, Награда } from "../config";
import { крутитьСлот, случайныйСимвол } from "../game/slot";
import { шансБесплатнойКрутки } from "../game/effects";
import { естьФайл, useАссеты } from "../lib/assets";
import { звук } from "../lib/sound";
import { хаптик, хаптикВыбор } from "../lib/haptic";
import { Т } from "../texts";

type Эффект = { вид: "конфетти"; эмодзи: string; id: string } | { вид: "взрыв" } | null;

// Блокировка слота хранится в памяти телефона, чтобы не пропадала при перезапуске игры
const ключБлока = (id: number | null) => `100hp_slot_lock_${id}`;
const минСек = (с: number) => `${Math.floor(с / 60)}:${String(с % 60).padStart(2, "0")}`;
const случайныйЭмодзи = () => случайныйСимвол().эмодзи;

// Награда в таблице: «+10 [значок]» для каждой валюты
function ВыплатаСтрока({ н, м, e }: { н: Награда; м: number; e: number }) {
  const части: { имя: "фишки" | "билеты" | "хэпэшки"; n: number }[] = [];
  if (н.фишки) части.push({ имя: "фишки", n: н.фишки * м });
  if (н.билеты) части.push({ имя: "билеты", n: н.билеты * м });
  if (н.хэпэшки) части.push({ имя: "хэпэшки", n: н.хэпэшки * м });
  return (
    <div className="flex items-center justify-end gap-3">
      {части.map((ч) => (
        <span key={ч.имя} className="flex items-center gap-1.5 text-sm font-bold">
          {Т.общее.плюс(ч.n)} <Иконка имя={ч.имя} размер={Math.max(22, 26 * e)} />
        </span>
      ))}
    </div>
  );
}

export default function Home() {
  const { user, change, telegramId } = useUser();
  useАссеты();

  const [барабаны, setБарабаны] = useState<string[]>(() => [случайныйЭмодзи(), случайныйЭмодзи(), случайныйЭмодзи()]);
  const [соседи, setСоседи] = useState<[string, string][]>(() => [0, 1, 2].map(() => [случайныйЭмодзи(), случайныйЭмодзи()] as [string, string]));
  const [крутятся, setКрутятся] = useState<boolean[]>([false, false, false]);
  const [идёт, setИдёт] = useState(false);
  const [бесплатныеКрутки, setБесплатныеКрутки] = useState(0);
  const [сообщение, setСообщение] = useState("");
  const [заморозка, setЗаморозка] = useState<{ chips: number; tickets: number; hearts: number } | null>(null);
  const [эффект, setЭффект] = useState<Эффект>(null);
  const [колесоОткрыто, setКолесоОткрыто] = useState(false);
  const [заблокированоДо, setЗаблокированоДо] = useState<number>(() => {
    try { return Number(localStorage.getItem(ключБлока(telegramId))) || 0; } catch { return 0; }
  });
  const [сейчас, setСейчас] = useState(Date.now());
  const [множитель, setМножитель] = useState<number>(СЛОТ.множителиСтавки[0]);
  const [автоспин, setАвтоспин] = useState(false);
  const автоспинRef = useRef(false);
  const занято = useRef(false);
  const [плавающие, setПлавающие] = useState<{ id: number; имя: "фишки" | "билеты" | "хэпэшки"; n: number; смещение: number; текст?: string }[]>([]);
  const счётПлавающих = useRef(0);

  // Ширина экрана → масштаб автомата (e = сколько пикселей в одной «единице рисунка»)
  const обёртка = useRef<HTMLDivElement>(null);
  const [ширина, setШирина] = useState(390);
  useEffect(() => {
    const el = обёртка.current;
    if (!el) return;
    const f = () => setШирина(el.clientWidth || 390);
    f();
    const ro = new ResizeObserver(f);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Тикаем раз в полсекунды, пока слот заблокирован
  useEffect(() => {
    if (заблокированоДо <= Date.now()) return;
    setСейчас(Date.now());
    const t = setInterval(() => {
      setСейчас(Date.now());
      if (Date.now() >= заблокированоДо) clearInterval(t);
    }, 500);
    return () => clearInterval(t);
  }, [заблокированоДо]);

  if (!user) return null;

  const A = АВТОМАТ;
  const e = ширина / A.видимаяШирина;
  const X = (x: number) => (x - A.сдвигСлева) * e;
  const Y = (y: number) => y * e;
  const S = (n: number) => n * e;
  const ПУТЬ = АССЕТЫ.папки.ui;

  const осталосьБлок = Math.max(0, Math.ceil((заблокированоДо - сейчас) / 1000));
  const заблокирован = осталосьБлок > 0;

  const баланс = заморозка ?? user;
  const бесплатная = бесплатныеКрутки > 0;
  // Бесплатная крутка идёт как x1 (если в config не включено иначе)
  const эфМножитель = бесплатная && !СЛОТ.бесплатнаяКруткаСМножителем ? 1 : множитель;
  const ставка = СЛОТ.билетовЗаКрутку * множитель; // сколько билетов спишется за обычную крутку
  const хватаетБилетов = user.tickets >= ставка;
  const можноКрутить = !идёт && !заблокирован && (бесплатная || хватаетБилетов);

  // Короткая всплывающая награда: «+10» + значок валюты (вспышка, парит вверх, плавно гаснет)
  const показатьНаграду = (н: { chips: number; tickets: number; hearts: number }) => {
    const список: { имя: "фишки" | "билеты" | "хэпэшки"; n: number }[] = [];
    if (н.chips > 0) список.push({ имя: "фишки", n: н.chips });
    if (н.tickets > 0) список.push({ имя: "билеты", n: н.tickets });
    if (н.hearts > 0) список.push({ имя: "хэпэшки", n: н.hearts });
    const новые = список.map((х, i) => ({ id: ++счётПлавающих.current, ...х, смещение: (i - (список.length - 1) / 2) * S(190) }));
    setПлавающие((п) => [...п, ...новые]);
    // Если несколько наград — показываем с задержкой 0.5с между ними
    новые.forEach((н, i) => {
      setTimeout(() => setПлавающие((п) => п.filter((х) => х.id !== н.id)), 1800 + i * 500);
    });
  };

  const показатьЭффект = (э: Эффект, секунд: number) => {
    setЭффект(э);
    setTimeout(() => setЭффект(null), секунд * 1000);
  };

  /** Анимация: барабаны мелькают и по очереди останавливаются на итоговых символах. */
  const анимировать = (итог: string[]) =>
    new Promise<void>((готово) => {
      const остановлен = [false, false, false];
      setКрутятся([true, true, true]);
      const таймер = setInterval(() => {
        хаптикВыбор(); // тик на каждый кадр прокрутки
        setБарабаны(() => итог.map((с, i) => (остановлен[i] ? с : случайныйЭмодзи())));
        setСоседи((п) => п.map((с, i) => (остановлен[i] ? с : ([случайныйЭмодзи(), случайныйЭмодзи()] as [string, string]))));
      }, СЛОТ.анимация.сменаКадраМс);
      итог.forEach((_, i) => {
        setTimeout(() => {
          остановлен[i] = true;
          хаптик("medium"); // удар при остановке барабана
          setКрутятся((п) => п.map((x, j) => (j === i ? false : x)));
          setБарабаны((п) => п.map((с, j) => (j === i ? итог[i] : с)));
          if (остановлен.every(Boolean)) { clearInterval(таймер); готово(); }
        }, СЛОТ.анимация.остановкаПервогоМс + i * СЛОТ.анимация.паузаМеждуБарабанамиМс);
      });
    });

  const крутить = async () => {
    if (занято.current || !можноКрутить) return;
    занято.current = true;
    setИдёт(true);
    setСообщение("");
    звук.sfx("спин"); // ← звук начала крутки

    const цена = бесплатная ? 0 : ставка;
    const итог = крутитьСлот(user.free_spin_level, бесплатная, эфМножитель, user.trash_level ?? 0);

    setЗаморозка({ chips: user.chips, tickets: user.tickets - цена, hearts: user.hearts });
    if (бесплатная) setБесплатныеКрутки((n) => n - 1);

    try {
      await Promise.all([
        change({
          chips: итог.награда.chips,
          tickets: итог.награда.tickets - цена,
          hearts: итог.награда.hearts,
        }),
        анимировать(итог.символы.map((с) => с.эмодзи)),
      ]);

      // Три одинаковых → эффекты
      const бомба = итог.тройка && !!итог.символы[0].бомба;
      if (бомба) {
        const до = Date.now() + СЛОТ.блокировкаПослеБомбСекунд * 1000;
        setЗаблокированоДо(до);
        try { localStorage.setItem(ключБлока(telegramId), String(до)); } catch {}
        показатьЭффект({ вид: "взрыв" }, СЛОТ.эффектыСекунд.взрыв);
        звук.sfx("взрыв");
        хаптик("heavy"); // мощная вибрация при взрыве
      } else if (итог.тройка) {
        показатьЭффект({ вид: "конфетти", эмодзи: итог.символы[0].эмодзи, id: итог.символы[0].id }, СЛОТ.эффектыСекунд.конфетти);
        звук.sfx("победа"); // ← звук джекпота
      } else if (итог.награда.chips || итог.награда.tickets || итог.награда.hearts) {
        звук.sfx("бонус"); // ← звук небольшого выигрыша
      }

      if (итог.бесплатнаяКрутка && !бомба) {
        setБесплатныеКрутки((n) => n + 1);
        // Показать надпись FREE SPIN
        const id = ++счётПлавающих.current;
        setПлавающие((п) => [...п, { id, имя: "билеты" as const, n: 0, смещение: 0, текст: "FREE SPIN" }]);
        setTimeout(() => setПлавающие((п) => п.filter((х) => х.id !== id)), 1800);
      }
      показатьНаграду(итог.награда);
    } catch (er: any) {
      if (бесплатная) setБесплатныеКрутки((n) => n + 1);
      setСообщение(Т.слот.ошибкаСохранения(er.message));
      setКрутятся([false, false, false]);
      звук.sfx("ошибка");
    } finally {
      setЗаморозка(null);
      setИдёт(false);
      занято.current = false;
    }
  };

  // Нажатие на кнопку: анимация идёт всегда, а крутится слот только если хватает билетов
  const нажатиеКнопки = () => {
    хаптик("light");
    if (автоспинRef.current) {
      // Повторное нажатие останавливает автоспин
      автоспинRef.current = false;
      setАвтоспин(false);
      return;
    }
    if (можноКрутить) крутить();
    else if (!идёт) звук.sfx("ошибка");
  };

  const запуститьАвтоспин = () => {
    if (!можноКрутить || автоспинRef.current) return;
    автоспинRef.current = true;
    setАвтоспин(true);
    const цикл = async () => {
      while (автоспинRef.current) {
        if (!можноКрутить && !бесплатная) break;
        await крутить();
        await new Promise((r) => setTimeout(r, 400));
      }
      автоспинRef.current = false;
      setАвтоспин(false);
    };
    цикл();
  };

  const подписьКнопки = идёт ? (
    Т.слот.кнопка.крутится
  ) : заблокирован ? (
    Т.слот.кнопка.блок(минСек(осталосьБлок))
  ) : бесплатная ? (
    Т.слот.кнопка.бесплатная(бесплатныеКрутки)
  ) : (
    <>
      {Т.слот.кнопка.крутить} • {ставка}
      <Иконка имя="билеты" размер={S(32)} className="brightness-0 invert" />
    </>
  );

  const градиентЕсть = естьФайл(ПУТЬ + АССЕТЫ.ui.градиентНиз) === true;
  const высотаГрадиента = S(A.видимаяШирина * 926 / 786); // пропорции slot-gradient.png (786×926)

  const панель = (р: { x: number; y: number; w: number; h: number }) => ({
    position: "absolute" as const, left: X(р.x), top: Y(р.y), width: S(р.w), height: S(р.h), zIndex: 40,
  });
  const пилюля = { display: "flex", alignItems: "center", gap: S(10), height: S(A.баланс.фишкиВысота), padding: `0 ${S(18)}px`, borderRadius: 9999, background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", fontSize: S(28), fontWeight: 700 } as const;

  return (
    <div>
      {эффект?.вид === "конфетти" && <Конфетти эмодзи={эффект.эмодзи} id={эффект.id} />}
      {эффект?.вид === "взрыв" && <Взрыв />}
      {колесоОткрыто && <КолесоФортуны onЗакрыть={() => setКолесоОткрыто(false)} />}

      {/* ================= АВТОМАТ ================= */}
      <div ref={обёртка} className="relative mx-auto max-w-[520px] select-none overflow-hidden" style={{ marginTop: -S(30) }}>
        {/* Экран автомата (фон) */}
        <div style={{ position: "absolute", left: X(A.экран.x), top: Y(A.экран.y), width: S(A.экран.w), height: S(A.экран.h), zIndex: 5 }}>
          <Картинка путь={ПУТЬ + АССЕТЫ.ui.экранАвтомата} fallback={<div className="h-full w-full rounded-2xl bg-black" />} className="h-full w-full" />
        </div>

        {/* Барабаны */}
        <div style={{ position: "absolute", left: X(A.экран.x), top: Y(A.экран.y), width: S(A.экран.w), height: S(A.экран.h), zIndex: 10, overflow: "hidden" }}>
          <SlotReels символы={барабаны} соседи={соседи} крутятся={крутятся} e={e} />
        </div>

        {/* Корпус автомата */}
        <Картинка
          путь={ПУТЬ + АССЕТЫ.ui.автомат}
          fallback={<div className="absolute inset-x-2 top-2 rounded-[32px] border border-white/10 bg-[#181920]" style={{ height: S(A.высотаСцены), zIndex: 20 }} />}
          className="pointer-events-none"
          style={{ position: "absolute", left: X(0), top: 0, width: S(A.ширинаКорпуса), maxWidth: "none", zIndex: 20 }}
        />

        {/* Блик на стекле */}
        <div style={{ position: "absolute", left: X(A.экран.x), top: Y(A.экран.y), width: S(472), height: S(A.экран.h), zIndex: 30, pointerEvents: "none" }}>
          <Картинка путь={ПУТЬ + АССЕТЫ.ui.бликЭкрана} fallback={null} className="h-full w-full" />
        </div>

        {/* Тёмная нижняя часть: плавный градиент под экраном и сплошной фон ниже */}
        {градиентЕсть ? (
          <>
            <div style={{ position: "absolute", left: 0, right: 0, top: Y(A.низГрадиентаY), height: высотаГрадиента, zIndex: 25, backgroundImage: `url(/${ПУТЬ + АССЕТЫ.ui.градиентНиз})`, backgroundSize: "100% 100%" }} />
            <div style={{ position: "absolute", left: 0, right: 0, top: Y(A.низГрадиентаY) + высотаГрадиента - 1, bottom: 0, zIndex: 25, background: "#1B1515" }} />
          </>
        ) : (
          <div style={{ position: "absolute", left: 0, right: 0, top: Y(A.низГрадиентаY), bottom: 0, zIndex: 25, background: `linear-gradient(rgba(27,21,21,0), #1B1515 ${S(300)}px)` }} />
        )}

        {/* Блокировка после бомб: сажа на экране и таймер */}
        {заблокирован && (
          <div
            className="flex items-center justify-center text-center font-bold text-orange-300"
            style={{ position: "absolute", left: X(A.экран.x), top: Y(A.экран.y), width: S(A.экран.w), height: S(A.экран.h), zIndex: 35, fontSize: S(34), background: "radial-gradient(circle at center, rgba(0,0,0,0.88) 0%, rgba(40,20,0,0.7) 60%, rgba(0,0,0,0.35) 100%)", borderRadius: S(30) }}
          >
            {Т.слот.закоптился(минСек(осталосьБлок))}
          </div>
        )}

        {/* Панели «Лидеры» и «Колесо»: иконка наполовину выступает за верхнюю границу ячейки */}
        {([
          { ключ: "лидеры", иконка: "лидерборд" as const, текст: Т.главная.лидеры },
          { ключ: "колесо", иконка: "колесо" as const, текст: Т.главная.колесо },
        ]).map((п) => {
          const содержимое = (
            <>
              <div style={{ position: "absolute", left: "50%", top: -S(46), transform: "translateX(-50%)", filter: "drop-shadow(0 0 8px rgba(255, 123, 0, 0.5))" }}>
                <Иконка имя={п.иконка} размер={S(92)} />
              </div>
              <span style={{ fontSize: S(24), marginBottom: S(16) }} className="font-semibold text-white/90">{п.текст}</span>
            </>
          );
          const класс = "flex flex-col items-center justify-end rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm active:brightness-125";
          return п.ключ === "лидеры" ? (
            <Link key={п.ключ} to="/leaderboard" style={панель(A.панели.лидеры)} className={класс}>{содержимое}</Link>
          ) : (
            <button key={п.ключ} onClick={() => { звук.sfx("клик"); setКолесоОткрыто(true); }} style={панель(A.панели.колесо)} className={класс}>{содержимое}</button>
          );
        })}

        {/* Баланс: хэпэшки крупно, фишки и билеты — «таблетками» */}
        <div style={{ position: "absolute", left: X(A.баланс.центрX - 220), width: S(440), top: Y(A.баланс.сердцеY), zIndex: 40 }} className="flex flex-col items-center">
          <div className="flex items-center justify-center" style={{ height: S(A.баланс.сердцеВысота), gap: S(22) }}>
            <Иконка имя="хэпэшки" размер={S(92)} />
            <span style={{ fontSize: S(70), lineHeight: 1 }} className="font-bold text-white">{баланс.hearts}</span>
          </div>
          <div className="flex items-center" style={{ marginTop: S(A.баланс.фишкиY - A.баланс.сердцеY - A.баланс.сердцеВысота), gap: S(20) }}>
            <div style={пилюля}><Иконка имя="фишки" размер={S(34)} />{баланс.chips}</div>
            <div style={пилюля}><Иконка имя="билеты" размер={S(34)} />{баланс.tickets}</div>
          </div>
        </div>

        {/* Всплывающие награды (+N и значок) над экраном */}
        {плавающие.map((п) => (
          <div key={п.id} className="pointer-events-none" style={{ position: "absolute", left: X(A.экран.x + A.экран.w / 2) + п.смещение, top: Y(A.экран.y + A.экран.h / 2), zIndex: 45, transform: "translate(-50%, -50%)" }}>
            <div className="reward-pop flex items-center gap-1 whitespace-nowrap font-extrabold text-white" style={{ fontSize: S(66), textShadow: "0 2px 8px rgba(0,0,0,0.7)" }}>
              {п.текст ? (
                <span className="mt-6 block text-brand-yellow drop-shadow-lg">{п.текст}</span>
              ) : (
                <>
                  {Т.общее.плюс(п.n)}
                  <Иконка имя={п.имя} размер={S(78)} />
                </>
              )}
            </div>
          </div>
        ))}

        {/* Кнопка Spin */}
        <div style={{ position: "absolute", left: X(A.кнопка.x), top: Y(A.кнопка.y), zIndex: 40 }}>
          <КнопкаСпин e={e} подпись={подписьКнопки} приглушена={!можноКрутить && !идёт} onНажатие={нажатиеКнопки} onДолгоеНажатие={запуститьАвтоспин} />
        </div>

        {/* Место под экран и кнопку */}
        <div style={{ height: S(A.высотаСцены) }} />

        {/* ===== Ниже кнопки: награда (множитель), подсказки, таблица ===== */}
        <div className="relative z-40 px-4 pb-2">
          <p className="mb-2 text-center text-xs text-white/70">{Т.слот.наградаМножитель}</p>
          <div className="grid grid-cols-4 gap-2">
            {СЛОТ.множителиСтавки.map((м) => (
              <button
                key={м}
                onClick={() => setМножитель(м)}
                disabled={идёт || (бесплатная && !СЛОТ.бесплатнаяКруткаСМножителем)}
                className={`btn !rounded-xl !px-0 !py-2.5 ${м === эфМножитель ? "!bg-[#F26B3A] text-white" : "!bg-[#26272D] text-white/90"}`}
              >
                x{м}
              </button>
            ))}
          </div>
          {сообщение && <p className="mt-2 text-center text-xs text-red-300">{сообщение}</p>}

          {/* Таблица наград — строится из config.ts автоматически, значения умножаются на выбранный множитель */}
          <details className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-3 text-sm">
            <summary className="cursor-pointer text-xs font-semibold text-white/80">{Т.слот.таблица.заголовок}</summary>
            <div className="mt-3 flex flex-col gap-2.5">
              {СИМВОЛЫ_СЛОТА.filter(с => !с.мусор).map((с) => (
                <div key={с.id} className="flex items-center justify-between gap-2">
                  <div className="flex gap-1">{[0, 1, 2].map((k) => <Символ key={k} id={с.id} эм={с.эмодзи} />)}</div>
                  {с.бомба ? (
                    <span className="flex items-center gap-2 text-sm font-bold">{Т.слот.таблица.бан(СЛОТ.блокировкаПослеБомбСекунд)} <Символ id={с.id} эм={с.эмодзи} /></span>
                  ) : (
                    <ВыплатаСтрока н={с.за3} м={эфМножитель} e={e} />
                  )}
                </div>
              ))}
              <div className="my-1 border-t border-white/10" />
              {СИМВОЛЫ_СЛОТА.filter((с) => !с.мусор && (с.за2.фишки || с.за2.билеты || с.за2.хэпэшки)).map((с) => (
                <div key={"2" + с.id} className="flex items-center justify-between gap-2 opacity-70">
                  <div className="flex gap-1">{[0, 1].map((k) => <Символ key={k} id={с.id} эм={с.эмодзи} />)}</div>
                  <ВыплатаСтрока н={с.за2} м={эфМножитель} e={e} />
                </div>
              ))}
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

// Маленькая картинка символа для таблицы наград
function Символ({ id, эм }: { id: string; эм: string }) {
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center text-2xl">
      <Картинка путь={`assets/icons/slot-${id}.png`} fallback={<span>{эм}</span>} className="h-full w-full object-contain" />
    </span>
  );
}

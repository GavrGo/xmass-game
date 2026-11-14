import { useEffect, useRef, useState } from "react";
import { useUser } from "../store/UserContext";
import SlotReels from "../components/SlotReels";
import { Конфетти, Взрыв } from "../components/SlotEffects";
import { Иконка } from "../components/Иконка";
import { СИМВОЛЫ_СЛОТА, СЛОТ, АССЕТЫ } from "../config";
import { крутитьСлот, случайныйСимвол, текстНаграды } from "../game/slot";
import { шансБесплатнойКрутки } from "../game/effects";
import { естьФайл, useАссеты } from "../lib/assets";
import { звук } from "../lib/sound";
import { Т } from "../texts";

type Эффект = { вид: "конфетти"; эмодзи: string } | { вид: "взрыв" } | null;

// Блокировка слота хранится в памяти телефона, чтобы не пропадала при перезапуске игры
const ключБлока = (id: number | null) => `100hp_slot_lock_${id}`;
const минСек = (с: number) => `${Math.floor(с / 60)}:${String(с % 60).padStart(2, "0")}`;

export default function Home() {
  const { user, change, telegramId } = useUser();
  useАссеты();

  const [барабаны, setБарабаны] = useState<string[]>(() => [случайныйСимвол().эмодзи, случайныйСимвол().эмодзи, случайныйСимвол().эмодзи]);
  const [крутятся, setКрутятся] = useState<boolean[]>([false, false, false]);
  const [идёт, setИдёт] = useState(false);
  const [бесплатныеКрутки, setБесплатныеКрутки] = useState(0);
  const [сообщение, setСообщение] = useState("");
  const [заморозка, setЗаморозка] = useState<{ chips: number; tickets: number; hearts: number } | null>(null);
  const [эффект, setЭффект] = useState<Эффект>(null);
  const [заблокированоДо, setЗаблокированоДо] = useState<number>(() => {
    try { return Number(localStorage.getItem(ключБлока(telegramId))) || 0; } catch { return 0; }
  });
  const [сейчас, setСейчас] = useState(Date.now());
  const [множитель, setМножитель] = useState<number>(СЛОТ.множителиСтавки[0]); // выбранный x1/x3/x5/x10
  const занято = useRef(false);

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

  const осталосьБлок = Math.max(0, Math.ceil((заблокированоДо - сейчас) / 1000));
  const заблокирован = осталосьБлок > 0;

  const баланс = заморозка ?? user;
  const бесплатная = бесплатныеКрутки > 0;
  // Бесплатная крутка идёт как x1 (если в config не включено иначе)
  const эфМножитель = бесплатная && !СЛОТ.бесплатнаяКруткаСМножителем ? 1 : множитель;
  const ставка = СЛОТ.билетовЗаКрутку * множитель; // сколько билетов спишется за обычную крутку
  const хватаетБилетов = user.tickets >= ставка;
  const можноКрутить = !идёт && !заблокирован && (бесплатная || хватаетБилетов);

  // Своя картинка кнопки: public/assets/ui/spin-button.png
  const картинкаКнопки = АССЕТЫ.папки.ui + АССЕТЫ.ui.кнопкаСпин;
  const своиКнопка = естьФайл(картинкаКнопки) === true;

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
        setБарабаны(() => итог.map((с, i) => (остановлен[i] ? с : случайныйСимвол().эмодзи)));
      }, СЛОТ.анимация.сменаКадраМс);
      итог.forEach((_, i) => {
        setTimeout(() => {
          остановлен[i] = true;
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
    const итог = крутитьСлот(user.free_spin_level, бесплатная, эфМножитель);

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
        звук.sfx("взрыв"); // ← звук взрыва бомб
      } else if (итог.тройка) {
        показатьЭффект({ вид: "конфетти", эмодзи: итог.символы[0].эмодзи }, СЛОТ.эффектыСекунд.конфетти);
        звук.sfx("победа"); // ← звук джекпота
      } else if (итог.награда.chips || итог.награда.tickets || итог.награда.hearts) {
        звук.sfx("бонус"); // ← звук небольшого выигрыша
      }

      if (итог.бесплатнаяКрутка && !бомба) setБесплатныеКрутки((n) => n + 1);
      setСообщение(итог.описание + (итог.бесплатнаяКрутка && !бомба ? Т.слот.выпалFreeSpin : ""));
    } catch (e: any) {
      if (бесплатная) setБесплатныеКрутки((n) => n + 1);
      setСообщение(Т.слот.ошибкаСохранения(e.message));
      setКрутятся([false, false, false]);
      звук.sfx("ошибка");
    } finally {
      setЗаморозка(null);
      setИдёт(false);
      занято.current = false;
    }
  };

  const подпись = идёт
    ? Т.слот.крутится
    : заблокирован
    ? Т.слот.нельзяКрутить(минСек(осталосьБлок))
    : бесплатная
    ? Т.слот.бесплатная(бесплатныеКрутки)
    : Т.слот.крутить(ставка);

  return (
    <div className="px-4 pb-6">
      {эффект?.вид === "конфетти" && <Конфетти эмодзи={эффект.эмодзи} />}
      {эффект?.вид === "взрыв" && <Взрыв />}

      {/* Крупный баланс: хэпэшки и фишки */}
      <div className="mt-1 flex flex-col items-center">
        <div className="flex items-center gap-2 text-5xl font-extrabold">
          <Иконка имя="хэпэшки" размер={44} /> {баланс.hearts}
        </div>
        <div className="mt-1 flex items-center gap-2 text-xl font-bold text-brand-yellow">
          <Иконка имя="фишки" размер={24} /> {баланс.chips}
        </div>
      </div>

      {/* Слот (после бомб покрывается сажей) */}
      <div
        className="relative mt-4 rounded-3xl"
        style={заблокирован ? { background: "radial-gradient(circle at center, rgba(0,0,0,0.85) 0%, rgba(40,20,0,0.55) 60%, rgba(0,0,0,0) 100%)" } : undefined}
      >
        {заблокирован && <p className="pt-3 text-center text-sm font-bold text-orange-300">{Т.слот.закоптился(минСек(осталосьБлок))}</p>}
        <div className="p-1">
          <SlotReels символы={барабаны} крутятся={крутятся} />
        </div>
      </div>

      <p className="mt-3 min-h-[2.5rem] text-center text-sm text-brand-yellow">{сообщение}</p>

      {/* Большая кнопка и билеты */}
      <div className="mt-3 flex flex-col items-center">
        <button
          onClick={крутить}
          disabled={!можноКрутить}
          className={`btn-spin ${своиКнопка ? "btn-spin-image" : ""}`}
          style={своиКнопка ? { backgroundImage: `url(/${картинкаКнопки})` } : undefined}
        >
          {подпись}
        </button>
        <div className="pill mt-6 inline-flex items-center gap-2 px-4 py-1.5 text-sm font-bold">
          <Иконка имя="билеты" размер={18} /> {баланс.tickets}
        </div>
      </div>

      {/* Переключатель множителя ставки */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        {СЛОТ.множителиСтавки.map((м) => (
          <button
            key={м}
            onClick={() => setМножитель(м)}
            disabled={идёт || (бесплатная && !СЛОТ.бесплатнаяКруткаСМножителем)}
            className={`btn !px-0 !py-2 ${м === эфМножитель ? "btn-yellow" : "btn-ghost"}`}
          >
            x{м}
          </button>
        ))}
      </div>
      <p className="mt-1 text-center text-xs text-white/40">{Т.слот.ставка(бесплатная ? 0 : ставка, эфМножитель, СЛОТ.блокировкаПослеБомбСекунд)}</p>

      {!идёт && !заблокирован && !бесплатная && !хватаетБилетов && (
        <p className="mt-2 text-center text-xs text-white/50">{Т.слот.нехватаетБилетов(множитель)}</p>
      )}
      <p className="mt-2 text-center text-xs text-white/40">{Т.слот.шансFreeSpin(шансБесплатнойКрутки(user))}</p>

      {/* Таблица выплат — строится из config.ts автоматически */}
      <details className="card mt-4 p-3 text-sm">
        <summary className="cursor-pointer text-white/70">{Т.слот.таблицаВыплат}</summary>
        <div className="mt-2 flex flex-col gap-1">
          {СИМВОЛЫ_СЛОТА.map((с) => (
            <div key={с.id} className="flex justify-between">
              <span>{с.эмодзи}{с.эмодзи}{с.эмодзи}</span>
              <span>{с.бомба ? Т.слот.блокВыплата(СЛОТ.блокировкаПослеБомбСекунд) : текстНаграды(с.за3) || "—"}</span>
            </div>
          ))}
          {СИМВОЛЫ_СЛОТА.filter((с) => текстНаграды(с.за2)).map((с) => (
            <div key={"2" + с.id} className="flex justify-between text-white/60">
              <span>{Т.слот.дваСимвола(с.эмодзи)}</span>
              <span>{текстНаграды(с.за2)}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

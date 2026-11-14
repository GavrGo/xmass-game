import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useUser } from "../store/UserContext";
import SlotReels from "../components/SlotReels";
import { Конфетти, Взрыв } from "../components/SlotEffects";
import { СИМВОЛЫ_СЛОТА, СЛОТ } from "../config";
import { крутитьСлот, случайныйСимвол, текстНаграды } from "../game/slot";
import { шансБесплатнойКрутки } from "../game/effects";

type Эффект = { вид: "конфетти"; эмодзи: string } | { вид: "взрыв" } | null;

// Блокировка слота хранится в памяти телефона, чтобы не пропадала при перезапуске игры
const ключБлока = (id: number | null) => `100hp_slot_lock_${id}`;
const минСек = (с: number) => `${Math.floor(с / 60)}:${String(с % 60).padStart(2, "0")}`;

export default function Home() {
  const { user, change, isAdmin, telegramId } = useUser();

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
      } else if (итог.тройка) {
        показатьЭффект({ вид: "конфетти", эмодзи: итог.символы[0].эмодзи }, СЛОТ.эффектыСекунд.конфетти);
      }

      if (итог.бесплатнаяКрутка && !бомба) setБесплатныеКрутки((n) => n + 1);
      setСообщение(итог.описание + (итог.бесплатнаяКрутка && !бомба ? " 🎁 Выпал Free Spin — крутите ещё раз бесплатно!" : ""));
    } catch (e: any) {
      if (бесплатная) setБесплатныеКрутки((n) => n + 1);
      setСообщение("Ошибка сохранения: " + (e.message ?? "попробуйте ещё раз"));
      setКрутятся([false, false, false]);
    } finally {
      setЗаморозка(null);
      setИдёт(false);
      занято.current = false;
    }
  };

  return (
    <div className="p-4">
      {эффект?.вид === "конфетти" && <Конфетти эмодзи={эффект.эмодзи} />}
      {эффект?.вид === "взрыв" && <Взрыв />}

      {/* Шапка: аватар, ник, справа — Лидерборд и (для админов) значок админки */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-3xl">{user.emoji}</div>
        <div className="min-w-0 flex-1 truncate font-bold">{user.nickname}</div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link to="/admin" aria-label="Админка" className="rounded-xl bg-white/10 px-3 py-2 text-lg">⚙️</Link>
          )}
          <Link to="/leaderboard" className="rounded-xl bg-white/10 px-3 py-2 text-sm font-bold text-xmas-gold">
            🏆 Лидерборд
          </Link>
        </div>
      </div>

      {/* Балансы */}
      <div className="mb-6 grid grid-cols-3 gap-2 text-center">
        <Баланс иконка="🪙" название="Фишки" значение={баланс.chips} />
        <Баланс иконка="🎟️" название="Билеты" значение={баланс.tickets} />
        <Баланс иконка="❤️" название="Хэпэшки" значение={баланс.hearts} />
      </div>

      {/* Слот (после бомб покрывается сажей) */}
      <div
        className="relative rounded-3xl"
        style={заблокирован ? { background: "radial-gradient(circle at center, rgba(0,0,0,0.85) 0%, rgba(40,20,0,0.55) 60%, rgba(0,0,0,0) 100%)" } : undefined}
      >
        {заблокирован && (
          <p className="pt-3 text-center text-sm font-bold text-orange-300">
            💣 Слот закоптился — нельзя крутить {минСек(осталосьБлок)}
          </p>
        )}
        <div className="p-2">
          <SlotReels символы={барабаны} крутятся={крутятся} />
        </div>
      </div>

      <p className="mt-3 h-10 text-center text-sm text-xmas-gold">{сообщение}</p>

      <button
        onClick={крутить}
        disabled={!можноКрутить}
        className="w-full rounded-xl bg-xmas-red py-4 text-lg font-bold disabled:bg-gray-600 disabled:text-white/40"
      >
        {идёт
          ? "Крутится…"
          : заблокирован
          ? `🔥 Нельзя крутить: ${минСек(осталосьБлок)}`
          : бесплатная
          ? `🎁 Бесплатная крутка (${бесплатныеКрутки})`
          : `Крутить · ${ставка} 🎟️`}
      </button>
      {/* Переключатель множителя ставки */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        {СЛОТ.множителиСтавки.map((м) => (
          <button
            key={м}
            onClick={() => setМножитель(м)}
            disabled={идёт || (бесплатная && !СЛОТ.бесплатнаяКруткаСМножителем)}
            className={`rounded-xl py-2 font-bold disabled:opacity-60 ${м === эфМножитель ? "bg-xmas-gold text-black" : "bg-white/10"}`}
          >
            x{м}
          </button>
        ))}
      </div>
      <p className="mt-1 text-center text-xs text-white/40">
        Ставка: {бесплатная ? 0 : ставка} 🎟️ · награда ×{эфМножитель} · бомбы всегда блокируют на {СЛОТ.блокировкаПослеБомбСекунд} сек
      </p>

      {!идёт && !заблокирован && !бесплатная && !хватаетБилетов && (
        <p className="mt-2 text-center text-xs text-white/50">Не хватает билетов для x{множитель} — уменьшите множитель или обменяйте фишки во вкладке «Обмен»</p>
      )}
      <p className="mt-2 text-center text-xs text-white/40">Шанс Free Spin: {шансБесплатнойКрутки(user)}%</p>

      {/* Таблица выплат — строится из config.ts автоматически */}
      <details className="mt-4 rounded-2xl bg-white/5 p-3 text-sm">
        <summary className="cursor-pointer text-white/70">Таблица выплат</summary>
        <div className="mt-2 flex flex-col gap-1">
          {СИМВОЛЫ_СЛОТА.map((с) => (
            <div key={с.id} className="flex justify-between">
              <span>{с.эмодзи}{с.эмодзи}{с.эмодзи}</span>
              <span>{с.бомба ? `💥 блок ${СЛОТ.блокировкаПослеБомбСекунд} сек` : текстНаграды(с.за3) || "—"}</span>
            </div>
          ))}
          {СИМВОЛЫ_СЛОТА.filter((с) => текстНаграды(с.за2)).map((с) => (
            <div key={"2" + с.id} className="flex justify-between text-white/60">
              <span>два {с.эмодзи}</span>
              <span>{текстНаграды(с.за2)}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

function Баланс(p: { иконка: string; название: string; значение: number }) {
  return (
    <div className="rounded-2xl bg-white/10 py-3">
      <div className="text-2xl">{p.иконка}</div>
      <div className="text-lg font-bold">{p.значение}</div>
      <div className="text-xs text-white/50">{p.название}</div>
    </div>
  );
}

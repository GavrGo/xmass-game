import { useRef, useState } from "react";
import { useUser } from "../store/UserContext";
import SlotReels from "../components/SlotReels";
import { СИМВОЛЫ_СЛОТА, СЛОТ } from "../config";
import { крутитьСлот, случайныйСимвол, текстНаграды } from "../game/slot";
import { шансБесплатнойКрутки } from "../game/effects";

export default function Home() {
  const { user, change } = useUser();

  // Барабаны: что сейчас показано и какие из них ещё крутятся
  const [барабаны, setБарабаны] = useState<string[]>(() => [случайныйСимвол().эмодзи, случайныйСимвол().эмодзи, случайныйСимвол().эмодзи]);
  const [крутятся, setКрутятся] = useState<boolean[]>([false, false, false]);
  const [идёт, setИдёт] = useState(false);
  const [бесплатныеКрутки, setБесплатныеКрутки] = useState(0); // накопленные Free Spin
  const [сообщение, setСообщение] = useState("");
  // Пока барабаны крутятся, показываем баланс «до результата», чтобы не спойлерить выигрыш
  const [заморозка, setЗаморозка] = useState<{ chips: number; tickets: number; hearts: number } | null>(null);
  const занято = useRef(false); // защита от двойного нажатия

  if (!user) return null;

  const баланс = заморозка ?? user;
  const бесплатная = бесплатныеКрутки > 0;
  const хватаетБилетов = user.tickets >= СЛОТ.билетовЗаКрутку;
  const можноКрутить = !идёт && (бесплатная || хватаетБилетов);

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

    const цена = бесплатная ? 0 : СЛОТ.билетовЗаКрутку;
    const итог = крутитьСлот(user.free_spin_level, бесплатная);

    // Показываем баланс после списания билета, но без награды
    setЗаморозка({ chips: user.chips, tickets: user.tickets - цена, hearts: user.hearts });
    if (бесплатная) setБесплатныеКрутки((n) => n - 1);

    try {
      // Сохраняем результат в базе и одновременно крутим анимацию
      await Promise.all([
        change({
          chips: итог.награда.chips,
          tickets: итог.награда.tickets - цена,
          hearts: итог.награда.hearts,
        }),
        анимировать(итог.символы.map((с) => с.эмодзи)),
      ]);
      if (итог.бесплатнаяКрутка) setБесплатныеКрутки((n) => n + 1);
      setСообщение(итог.описание + (итог.бесплатнаяКрутка ? " 🎁 Выпал Free Spin — крутите ещё раз бесплатно!" : ""));
    } catch (e: any) {
      if (бесплатная) setБесплатныеКрутки((n) => n + 1); // вернули бесплатную крутку
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
      {/* Шапка */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-3xl">{user.emoji}</div>
        <div className="font-bold">{user.nickname}</div>
      </div>

      {/* Балансы */}
      <div className="mb-6 grid grid-cols-3 gap-2 text-center">
        <Баланс иконка="🪙" название="Фишки" значение={баланс.chips} />
        <Баланс иконка="🎟️" название="Билеты" значение={баланс.tickets} />
        <Баланс иконка="❤️" название="Хэпэшки" значение={баланс.hearts} />
      </div>

      {/* Слот */}
      <SlotReels символы={барабаны} крутятся={крутятся} />

      <p className="mt-3 h-10 text-center text-sm text-xmas-gold">{сообщение}</p>

      <button
        onClick={крутить}
        disabled={!можноКрутить}
        className="w-full rounded-xl bg-xmas-red py-4 text-lg font-bold disabled:bg-gray-600 disabled:text-white/40"
      >
        {идёт
          ? "Крутится…"
          : бесплатная
          ? `🎁 Бесплатная крутка (${бесплатныеКрутки})`
          : `Крутить · ${СЛОТ.билетовЗаКрутку} 🎟️`}
      </button>
      {!идёт && !бесплатная && !хватаетБилетов && (
        <p className="mt-2 text-center text-xs text-white/50">Не хватает билетов — обменяйте фишки во вкладке «Обмен»</p>
      )}
      <p className="mt-2 text-center text-xs text-white/40">Шанс Free Spin: {шансБесплатнойКрутки(user)}%</p>

      {/* Таблица выплат — строится из config.ts автоматически */}
      <details className="mt-4 rounded-2xl bg-white/5 p-3 text-sm">
        <summary className="cursor-pointer text-white/70">Таблица выплат</summary>
        <div className="mt-2 flex flex-col gap-1">
          {СИМВОЛЫ_СЛОТА.map((с) => (
            <div key={с.id} className="flex justify-between">
              <span>{с.эмодзи}{с.эмодзи}{с.эмодзи}</span>
              <span>{текстНаграды(с.за3) || "—"}</span>
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

import { useState } from "react";
import { useUser } from "../store/UserContext";
import { ОБМЕН, МАГАЗИН_ОБМЕННИКА, ОНБОРДИНГ } from "../config";
import { комиссияОбменаПроц } from "../game/effects";
import { посчитатьОбмен, Направление } from "../game/exchange";
import { прочитатьКрутки, записатьКрутки } from "../game/emoji";
import AvatarSpinModal from "../components/AvatarSpinModal";

export default function Exchange() {
  const { user, change, telegramId } = useUser();
  const [направление, setНаправление] = useState<Направление>("chipsToTickets");
  const [ввод, setВвод] = useState("");
  const [сообщение, setСообщение] = useState("");
  const [занят, setЗанят] = useState(false);

  // --- Магазин ---
  const [новыйНик, setНовыйНик] = useState("");
  const [сообщениеМагазина, setСообщениеМагазина] = useState("");
  const [крутки, setКрутки] = useState(() => прочитатьКрутки(telegramId));
  const [окноАватара, setОкноАватара] = useState(false);

  if (!user) return null;

  const комиссия = комиссияОбменаПроц(user);
  const количество = Math.max(0, Math.floor(Number(ввод) || 0));
  const { получите, спишется } = посчитатьОбмен(направление, количество, комиссия);

  const фишкиВБилеты = направление === "chipsToTickets";
  const баланс = фишкиВБилеты ? user.chips : user.tickets;
  const хватает = количество <= баланс;
  const можно = !занят && получите >= 1 && хватает;

  const подтвердить = async () => {
    if (!можно) return;
    setЗанят(true);
    try {
      await change(
        фишкиВБилеты
          ? { chips: -спишется, tickets: получите }
          : { tickets: -спишется, chips: получите }
      );
      setСообщение(`Готово: −${спишется} ${фишкиВБилеты ? "🪙" : "🎟️"}, +${получите} ${фишкиВБилеты ? "🎟️" : "🪙"}`);
      setВвод("");
    } catch (e: any) {
      setСообщение("Ошибка: " + e.message);
    }
    setЗанят(false);
  };

  const переключить = () => {
    setНаправление(фишкиВБилеты ? "ticketsToChips" : "chipsToTickets");
    setВвод("");
    setСообщение("");
  };

  // ---------- Смена никнейма ----------
  const цНик = МАГАЗИН_ОБМЕННИКА.сменаНика.цена;
  const ник = новыйНик.trim();
  const ник_ок = ник.length >= ОНБОРДИНГ.минДлинаНика && ник.length <= ОНБОРДИНГ.максДлинаНика && ник !== user.nickname;

  const сменитьНик = async () => {
    if (занят || !ник_ок || user.chips < цНик) return;
    setЗанят(true);
    setСообщениеМагазина("");
    try {
      await change({ chips: -цНик }, { nickname: ник });
      setСообщениеМагазина(`✅ Ник изменён на «${ник}»`);
      setНовыйНик("");
    } catch (e: any) {
      setСообщениеМагазина("Ошибка: " + e.message);
    }
    setЗанят(false);
  };

  // ---------- Крутки эмодзи ----------
  const цКрутки = МАГАЗИН_ОБМЕННИКА.кручкиЭмодзи.цена;
  const колКруток = МАГАЗИН_ОБМЕННИКА.кручкиЭмодзи.количество;

  const купитьКрутки = async () => {
    if (занят || user.chips < цКрутки) return;
    setЗанят(true);
    setСообщениеМагазина("");
    try {
      await change({ chips: -цКрутки });
      const новое = крутки + колКруток;
      записатьКрутки(telegramId, новое);
      setКрутки(новое);
      setОкноАватара(true); // сразу открываем выбор аватара
    } catch (e: any) {
      setСообщениеМагазина("Ошибка: " + e.message);
    }
    setЗанят(false);
  };

  const списатьКрутку = () => {
    const новое = Math.max(0, крутки - 1);
    записатьКрутки(telegramId, новое);
    setКрутки(новое);
  };

  return (
    <div className="p-4">
      <h2 className="mb-1 text-xl font-bold">Обмен валют</h2>
      <p className="mb-4 text-white/60">🪙 {user.chips} · 🎟️ {user.tickets}</p>

      {/* Направление */}
      <button onClick={переключить} className="mb-4 flex w-full items-center justify-center gap-3 rounded-2xl bg-white/10 py-4 text-xl font-bold">
        <span>{фишкиВБилеты ? "🪙 Фишки" : "🎟️ Билеты"}</span>
        <span className="text-xmas-gold">⇄</span>
        <span>{фишкиВБилеты ? "🎟️ Билеты" : "🪙 Фишки"}</span>
      </button>

      {/* Ввод количества */}
      <label className="text-sm text-white/60">
        Отдаёте ({фишкиВБилеты ? "фишек" : "билетов"})
        <div className="mt-1 flex gap-2">
          <input
            type="number" inputMode="numeric" min={0} value={ввод}
            onChange={(e) => { setВвод(e.target.value); setСообщение(""); }}
            placeholder="0"
            className="w-full rounded-xl bg-white/10 px-4 py-3 text-lg text-white outline-none focus:ring-2 focus:ring-xmas-gold"
          />
          <button onClick={() => setВвод(String(баланс))} className="rounded-xl bg-white/10 px-4 font-bold">Всё</button>
        </div>
      </label>

      {/* Расчёт */}
      <div className="mt-4 rounded-2xl bg-white/5 p-4 text-sm">
        <Строка л="Курс без комиссии" п={`1 🎟️ = ${ОБМЕН.фишекЗаБилет} 🪙`} />
        <Строка л="Комиссия" п={`${комиссия}%`} />
        <Строка л="Спишется" п={`${спишется} ${фишкиВБилеты ? "🪙" : "🎟️"}`} />
        <div className="mt-2 flex justify-between text-lg font-bold text-xmas-gold">
          <span>Получите</span>
          <span>{получите} {фишкиВБилеты ? "🎟️" : "🪙"}</span>
        </div>
      </div>

      {!хватает && <p className="mt-2 text-sm text-red-400">Не хватает средств</p>}
      {количество > 0 && получите < 1 && хватает && <p className="mt-2 text-sm text-white/50">Слишком мало: после комиссии не выйдет и 1 единицы</p>}

      <button
        onClick={подтвердить} disabled={!можно}
        className="mt-4 w-full rounded-xl bg-xmas-green py-3 text-lg font-bold disabled:bg-gray-600 disabled:text-white/40"
      >
        Обменять
      </button>
      {сообщение && <p className="mt-3 text-center text-sm text-xmas-gold">{сообщение}</p>}

      {/* ================= МАГАЗИН ================= */}
      <h3 className="mb-3 mt-8 text-lg font-bold">Магазин</h3>

      {/* Смена ника */}
      <div className="mb-3 rounded-2xl bg-white/10 p-4">
        <div className="flex justify-between font-bold">
          <span>✏️ Смена никнейма</span>
          <span className="text-xmas-gold">{цНик} 🪙</span>
        </div>
        <p className="mb-2 text-sm text-white/60">Сейчас: {user.nickname}</p>
        <input
          value={новыйНик}
          onChange={(e) => setНовыйНик(e.target.value)}
          maxLength={ОНБОРДИНГ.максДлинаНика}
          placeholder="Новый ник"
          className="w-full rounded-xl bg-black/30 px-4 py-2 text-white outline-none focus:ring-2 focus:ring-xmas-gold"
        />
        <button
          onClick={сменитьНик}
          disabled={занят || !ник_ок || user.chips < цНик}
          className="mt-2 w-full rounded-xl bg-xmas-green py-2 font-bold disabled:bg-gray-600 disabled:text-white/40"
        >
          Сменить за {цНик} 🪙
        </button>
        {user.chips < цНик && <p className="mt-1 text-xs text-red-400">Не хватает фишек</p>}
      </div>

      {/* Крутки эмодзи */}
      <div className="rounded-2xl bg-white/10 p-4">
        <div className="flex justify-between font-bold">
          <span>{user.emoji} {колКруток} круток аватарки</span>
          <span className="text-xmas-gold">{цКрутки} 🪙</span>
        </div>
        <p className="mb-2 text-sm text-white/60">
          Крутите эмодзи и выберите новый аватар.
          {крутки > 0 && <> У вас осталось круток: <b>{крутки}</b>.</>}
        </p>
        {крутки > 0 && (
          <button onClick={() => setОкноАватара(true)} className="mb-2 w-full rounded-xl bg-xmas-red py-2 font-bold">
            Крутить аватарку ({крутки})
          </button>
        )}
        <button
          onClick={купитьКрутки}
          disabled={занят || user.chips < цКрутки}
          className="w-full rounded-xl bg-xmas-green py-2 font-bold disabled:bg-gray-600 disabled:text-white/40"
        >
          Купить {колКруток} круток за {цКрутки} 🪙
        </button>
        {user.chips < цКрутки && <p className="mt-1 text-xs text-red-400">Не хватает фишек</p>}
      </div>

      {сообщениеМагазина && <p className="mt-3 text-center text-sm text-xmas-gold">{сообщениеМагазина}</p>}

      {окноАватара && (
        <AvatarSpinModal
          текущий={user.emoji}
          осталось={крутки}
          onКрутка={списатьКрутку}
          onВыбрать={(э) => change({}, { emoji: э })}
          onЗакрыть={() => setОкноАватара(false)}
        />
      )}
    </div>
  );
}

const Строка = ({ л, п }: { л: string; п: string }) => (
  <div className="flex justify-between py-0.5 text-white/70"><span>{л}</span><span>{п}</span></div>
);

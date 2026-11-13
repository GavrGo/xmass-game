import { useState } from "react";
import { useUser } from "../store/UserContext";
import { ОБМЕН } from "../config";
import { комиссияОбменаПроц } from "../game/effects";
import { посчитатьОбмен, Направление } from "../game/exchange";

export default function Exchange() {
  const { user, change } = useUser();
  const [направление, setНаправление] = useState<Направление>("chipsToTickets");
  const [ввод, setВвод] = useState("");
  const [сообщение, setСообщение] = useState("");
  const [занят, setЗанят] = useState(false);
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
    </div>
  );
}

const Строка = ({ л, п }: { л: string; п: string }) => (
  <div className="flex justify-between py-0.5 text-white/70"><span>{л}</span><span>{п}</span></div>
);

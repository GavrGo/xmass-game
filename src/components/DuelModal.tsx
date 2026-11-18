import { useMemo, useState } from "react";
import { useUser } from "../store/UserContext";
import Модалка from "./Modal";
import { Иконка } from "./Icon";
import { Т } from "../texts";
import { хаптик, хаптикУведомление } from "../lib/haptic";
import {
  ВЫБОРЫ, эмодзиВыбора, создатьДуэль, принятьДуэль, отказатьсяОтДуэли, уведомить,
  type Выбор, type Дуэль,
} from "../api/duels";

export interface Соперник { id: number; nickname: string; emoji: string }
export type РежимДуэли =
  | { вид: "send"; соперник: Соперник }
  | { вид: "reply"; дуэль: Дуэль; соперник: Соперник };

type Этап = "offer" | "pick" | "count" | "result";
const пауза = (мс: number) => new Promise<void>((r) => setTimeout(r, мс));
const ТД = Т.дуэль;

function Выбиралка({ выбор, set }: { выбор: Выбор | null; set: (в: Выбор) => void }) {
  return (
    <div className="flex justify-center gap-3">
      {ВЫБОРЫ.map((в) => (
        <button
          key={в.ключ}
          onClick={() => { хаптик("light"); set(в.ключ); }}
          className={`flex h-20 w-20 items-center justify-center rounded-2xl border-2 text-4xl transition ${
            выбор === в.ключ ? "border-brand-yellow bg-white/20 scale-105" : "border-white/10 bg-white/5"
          }`}
        >
          {в.эмодзи}
        </button>
      ))}
    </div>
  );
}

const Сумма = ({ n, размер, шрифт }: { n: number; размер: number; шрифт: string }) => (
  <div className={`flex items-center justify-center gap-2 font-black ${шрифт}`}>
    {n} <Иконка имя="хэпэшки" размер={размер} />
  </div>
);

function Салют() {
  const частицы = useMemo(() => {
    const список: { x: number; y: number; dx: number; dy: number; d: number }[] = [];
    [[28, 30, 0], [72, 26, 0.45], [50, 38, 0.9]].forEach(([x, y, d]) => {
      for (let i = 0; i < 16; i++) {
        const угол = (i / 16) * Math.PI * 2 + Math.random() * 0.4;
        const р = 70 + Math.random() * 70;
        список.push({ x, y, dx: Math.cos(угол) * р, dy: Math.sin(угол) * р, d: d + Math.random() * 0.1 });
      }
    });
    return список;
  }, []);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {частицы.map((ч, i) => (
        <span
          key={i}
          className="duel-particle"
          style={{ left: `${ч.x}%`, top: `${ч.y}%`, ["--dx" as any]: `${ч.dx}px`, ["--dy" as any]: `${ч.dy}px`, ["--delay" as any]: `${ч.d}s` }}
        />
      ))}
    </div>
  );
}

export default function DuelModal({ режим, onClose, onChange }: { режим: РежимДуэли; onClose: () => void; onChange: () => void }) {
  const { user, telegramId } = useUser();
  const [этап, setЭтап] = useState<Этап>(режим.вид === "send" ? "pick" : "offer");
  const [выбор, setВыбор] = useState<Выбор | null>(null);
  const [ставкаВвод, setСтавка] = useState(1);
  const [число, setЧисло] = useState(3);
  const [итог, setИтог] = useState<Дуэль | null>(null);
  const [занято, setЗанято] = useState(false);
  const [ошибка, setОшибка] = useState("");
  if (!user || !telegramId) return null;

  const { соперник } = режим;
  const максСтавка = Math.max(1, user.hearts);
  const зажать = (n: number) => Math.max(1, Math.min(максСтавка, Math.floor(n) || 1));
  const ставка = зажать(ставкаВвод);

  const отправить = async () => {
    if (!выбор || занято || режим.вид !== "send" || user.hearts < ставка) return;
    setЗанято(true); setОшибка("");
    try {
      await создатьДуэль(telegramId, соперник.id, выбор, ставка);
      уведомить("challenge", соперник.id, user.nickname);
      onChange(); onClose();
    } catch (e: any) { setОшибка(e.message ?? ТД.ошибка); setЗанято(false); }
  };

  const отказать = async () => {
    if (режим.вид !== "reply" || занято) return;
    setЗанято(true); setОшибка("");
    try {
      await отказатьсяОтДуэли(режим.дуэль.id, telegramId);
      уведомить("declined", соперник.id, user.nickname);
      onChange(); onClose();
    } catch (e: any) { setОшибка(e.message ?? ТД.ошибка); setЗанято(false); onChange(); }
  };

  const сыграть = async () => {
    if (!выбор || занято || режим.вид !== "reply") return;
    setЗанято(true); setОшибка("");
    try {
      const д = await принятьДуэль(режим.дуэль.id, telegramId, выбор);
      setИтог(д);
      const вид = д.winner_id === null ? "draw" : д.winner_id === соперник.id ? "won" : "lost";
      уведомить(вид, соперник.id, user.nickname, д.bet * 2);
      onChange();
      setЭтап("count");
      for (const n of [3, 2, 1]) { setЧисло(n); хаптик("heavy"); await пауза(1000); }
      setЭтап("result");
      хаптикУведомление(вид === "won" ? "error" : вид === "lost" ? "success" : "warning");
    } catch (e: any) { setОшибка(e.message ?? ТД.ошибка); setЗанято(false); onChange(); }
  };

  if (этап === "count") {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90">
        <div key={число} className="duel-count text-[160px] font-black leading-none text-white">{число}</div>
      </div>
    );
  }

  if (этап === "result" && итог) {
    const исход = итог.winner_id === null ? "draw" : итог.winner_id === telegramId ? "win" : "lose";
    const моё = итог.target_pick;
    const его = итог.challenger_pick;
    return (
      <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center overflow-hidden bg-black/90 p-6 text-center">
        {исход === "win" && <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 50% 30%, rgba(255,200,60,0.35), transparent 65%)" }} />}
        {исход === "win" && <Салют />}
        {исход === "lose" && <div className="duel-red pointer-events-none absolute inset-0" />}
        {исход === "draw" && <div className="duel-flash pointer-events-none absolute inset-0 bg-white" />}

        <div className={`relative text-4xl font-black ${
          исход === "win" ? "duel-win text-brand-yellow" : исход === "lose" ? "duel-drop text-red-400" : "duel-pop text-white"
        }`}>
          {исход === "win" ? ТД.победа : исход === "lose" ? ТД.поражение : ТД.ничья}
        </div>

        <div className="relative mt-6 flex items-center gap-5">
          <div><div className="text-6xl">{эмодзиВыбора(моё)}</div><div className="mt-1 text-xs text-white/60">{ТД.вы}</div></div>
          <div className="text-xl text-white/40">vs</div>
          <div><div className="text-6xl">{эмодзиВыбора(его)}</div><div className="mt-1 max-w-[110px] truncate text-xs text-white/60">{соперник.nickname}</div></div>
        </div>

        <div className="relative mt-6">
          {исход === "win" && (<><Сумма n={итог.bet * 2} размер={44} шрифт="text-6xl text-brand-yellow" /><div className="mt-1 text-base text-white/80">{ТД.достаётсяВам}</div></>)}
          {исход === "lose" && (<><Сумма n={итог.bet * 2} размер={20} шрифт="text-2xl" /><div className="mt-1 text-sm text-white/70">{ТД.достаётсяКому(соперник.nickname)}</div></>)}
          {исход === "draw" && <div className="text-sm text-white/70">{ТД.возврат}</div>}
        </div>

        <button onClick={() => { onChange(); onClose(); }} className="btn btn-yellow relative mt-8 w-full max-w-[260px]">{ТД.выйти}</button>
      </div>
    );
  }

  const бет = режим.вид === "reply" ? режим.дуэль.bet : ставка;
  const хватает = user.hearts >= бет;

  return (
    <Модалка onClose={onClose}>
      {режим.вид === "send" && (
        <>
          <div className="mb-4 text-lg font-extrabold">{ТД.заголовок(соперник.nickname)}</div>
          <Выбиралка выбор={выбор} set={setВыбор} />
          <div className="mt-5 text-xs text-white/60">{ТД.ставка}</div>
          <div className="mt-2 flex w-full items-center justify-center gap-1">
            {[["-100", -100], ["−10", -10], ["−1", -1]].map(([п, ш]) => (
              <button key={п as string} onClick={() => setСтавка(зажать(ставка + (ш as number)))} className="btn btn-ghost !rounded-lg !px-0 w-9 !py-2 text-xs">{п}</button>
            ))}
            <div className="flex h-12 w-24 items-center justify-center gap-1 rounded-xl border border-white/15 bg-black/40">
              <input
                type="number" inputMode="numeric" value={ставка}
                onChange={(e) => setСтавка(зажать(Number(e.target.value)))}
                className="w-14 bg-transparent text-center text-xl font-extrabold text-white outline-none"
              />
              <Иконка имя="хэпэшки" размер={18} />
            </div>
            {[["+1", 1], ["+10", 10], ["+100", 100]].map(([п, ш]) => (
              <button key={п as string} onClick={() => setСтавка(зажать(ставка + (ш as number)))} className="btn btn-ghost !rounded-lg !px-0 w-9 !py-2 text-xs">{п}</button>
            ))}
          </div>
          <button onClick={отправить} disabled={!выбор || занято || user.hearts < 1} className="btn btn-yellow mt-5 w-full">{ТД.отправить}</button>
        </>
      )}

      {режим.вид === "reply" && этап === "offer" && (
        <>
          <div className="mb-3 text-base font-bold">{ТД.вызывает(соперник.nickname)}</div>
          <div className="text-xs text-white/60">{ТД.ставкаВызова}</div>
          <div className="my-3"><Сумма n={режим.дуэль.bet} размер={44} шрифт="text-6xl text-brand-yellow" /></div>
          {!хватает && <div className="mb-2 text-xs text-red-300">{ТД.недостаточно}</div>}
          <div className="mt-2 flex gap-3">
            <button onClick={() => setЭтап("pick")} disabled={!хватает || занято} className="btn btn-yellow flex-1">{ТД.принять}</button>
            <button onClick={отказать} disabled={занято} className="btn btn-red flex-1">{ТД.отказать}</button>
          </div>
        </>
      )}

      {режим.вид === "reply" && этап === "pick" && (
        <>
          <div className="mb-4 text-lg font-extrabold">{ТД.выберите}</div>
          <Выбиралка выбор={выбор} set={setВыбор} />
          <button onClick={сыграть} disabled={!выбор || занято} className="btn btn-yellow mt-5 w-full">{ТД.начать}</button>
        </>
      )}

      {ошибка && <p className="mt-3 text-sm text-red-300">{ошибка}</p>}
    </Модалка>
  );
}

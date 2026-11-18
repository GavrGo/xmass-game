import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../store/UserContext";
import { БЛЭКДЖЕК, ОБМЕН } from "../config";
import { Т } from "../texts";
import { звук } from "../lib/sound";
import { хаптик, хаптикУведомление } from "../lib/haptic";
import { стат } from "../lib/stats";
import { getSafeTop } from "../lib/telegram";
import { комиссияОбменаПроц } from "../game/effects";
import { новаяКолода, очки, блэкджек, торговецБерёт, исход } from "../game/blackjack";
import type { Карта, Исход } from "../game/blackjack";
import PlayingCard, { CardBack } from "../components/PlayingCard";
import MerchantStage from "../components/MerchantStage";
import SpeechBubble from "../components/SpeechBubble";

const ТБ = Т.блэкджек;
const А = БЛЭКДЖЕК.анимации;
const пауза = (мс: number) => new Promise<void>((r) => setTimeout(r, мс));
const между = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

// Счётчик реплик живёт, пока открыто приложение: фраза не чаще чем раз в «мин» и не реже чем раз в «макс» раздач.
let раздачСФразы = 0;
let порогФразы = между(БЛЭКДЖЕК.фразаРеже.мин, БЛЭКДЖЕК.фразаРеже.макс);
let прошлаяФраза = "";
function фраза(о: Исход): string | null {
  раздачСФразы++;
  if (раздачСФразы < порогФразы) return null;
  раздачСФразы = 0;
  порогФразы = между(БЛЭКДЖЕК.фразаРеже.мин, БЛЭКДЖЕК.фразаРеже.макс);
  const список = ТБ.фразы[о === "win" ? "победаИгрока" : о === "lose" ? "проигрышИгрока" : "ничья"];
  const варианты = список.filter((ф) => ф !== прошлаяФраза);
  прошлаяФраза = варианты[Math.floor(Math.random() * варианты.length)];
  return прошлаяФраза;
}

type Фаза = "dealing" | "player" | "dealer" | "done";
interface Итог { вид: Исход; подпись: string }

function Рука({ карты, cw, ширина, вверх, скрытьВторую, уходит, подсказка }: {
  карты: Карта[]; cw: number; ширина: number; вверх: boolean; скрытьВторую: boolean; уходит: boolean; подсказка: number | null;
}) {
  const n = карты.length;
  const ch = Math.round(cw * 1.42);
  const dx = n > 1 ? Math.min(cw * 0.3, (ширина - 56 - cw) / (n - 1)) : 0;
  const dy = вверх && n > 1 ? Math.min(cw * 0.2, (cw * 0.5) / (n - 1)) : 0;
  return (
    <div className="relative w-full" style={{ height: ch + (вверх ? cw * 0.5 : 10) }}>
      {карты.map((к, i) => {
        const x = (i - (n - 1) / 2) * dx - cw / 2;
        const y = ((n - 1) / 2 - i) * dy + (вверх ? cw * 0.25 : 0);
        return (
          <div key={к.id} className="absolute left-1/2 top-0" style={{
            zIndex: i, opacity: уходит ? 0 : 1, transition: "transform .38s ease, opacity .38s ease",
            transform: уходит ? `translate(${x + cw}px, ${y - 140}px) rotate(14deg) scale(.8)` : `translate(${x}px, ${y}px)`,
          }}>
            <PlayingCard карта={к} закрыта={скрытьВторую && i === 1} w={cw} />
          </div>
        );
      })}
      {подсказка !== null && n > 0 && (
        <div className="absolute top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-1.5 text-center text-sm font-bold text-white backdrop-blur"
          style={{ left: `calc(50% - ${Math.round(cw * 1.55)}px)`, minWidth: 38 }}>
          {подсказка}
        </div>
      )}
    </div>
  );
}

export default function Blackjack() {
  const { user, patch } = useUser();
  const navigate = useNavigate();

  const [игрок, setИгрок] = useState<Карта[]>([]);
  const [торговец, setТорговец] = useState<Карта[]>([]);
  const [закрыта, setЗакрыта] = useState(true);
  const [фаза, setФаза] = useState<Фаза>("dealing");
  const [итог, setИтог] = useState<Итог | null>(null);
  const [уходят, setУходят] = useState(false);
  const [комиссия, setКомиссия] = useState(() => (user ? комиссияОбменаПроц(user) : ОБМЕН.базоваяКомиссияПроцентов));
  const [дельта, setДельта] = useState<{ id: number; v: number } | null>(null);
  const [реплика, setРеплика] = useState<{ id: number; текст: string } | null>(null);
  const [ошибка, setОшибка] = useState("");
  const [размер, setРазмер] = useState({ w: window.innerWidth, h: window.innerHeight });

  const колода = useRef<Карта[]>([]);
  const рИ = useRef<Карта[]>([]);
  const рТ = useRef<Карта[]>([]);
  const комиссияRef = useRef(комиссия);
  const занят = useRef(false);
  const жив = useRef(true);
  const счётчик = useRef(0);
  const таймерРеплики = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const f = () => setРазмер({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);

  useEffect(() => {
    жив.current = true;
    раздать();
    return () => { жив.current = false; clearTimeout(таймерРеплики.current); };
  }, []);

  const взять = (кому: "и" | "т") => {
    const карта = колода.current.pop()!;
    if (кому === "и") { рИ.current = [...рИ.current, карта]; setИгрок(рИ.current); }
    else { рТ.current = [...рТ.current, карта]; setТорговец(рТ.current); }
    звук.sfx("ход");
    хаптик("light");
  };

  const показатьФразу = (текст: string) => {
    setРеплика({ id: ++счётчик.current, текст });
    clearTimeout(таймерРеплики.current);
    таймерРеплики.current = setTimeout(() => setРеплика(null), БЛЭКДЖЕК.показФразыСек * 1000);
  };

  const завершить = async () => {
    const п = рИ.current;
    const т = рТ.current;
    const вид = исход(п, т);
    const подпись =
      очки(п).сумма > 21 ? ТБ.переборИгрока
      : очки(т).сумма > 21 ? ТБ.переборТорговца
      : блэкджек(п) && вид === "win" ? ТБ.блэкджекИгрока
      : блэкджек(т) && вид === "lose" ? ТБ.блэкджекТорговца
      : "";

    const было = комиссияRef.current;
    const сдвиг = вид === "lose" ? БЛЭКДЖЕК.шагКомиссииПроцентов : вид === "win" ? -БЛЭКДЖЕК.шагКомиссииПроцентов : 0;
    const стало = Math.min(ОБМЕН.максимальнаяКомиссияПроцентов, Math.max(ОБМЕН.минимальнаяКомиссияПроцентов, было + сдвиг));
    if (стало !== было) {
      комиссияRef.current = стало;
      setКомиссия(стало);
      setДельта({ id: ++счётчик.current, v: стало - было });
      patch({ exchange_fee: стало }).catch((e: any) => setОшибка(ТБ.ошибкаСохранения(e?.message ?? "")));
    }

    setИтог({ вид, подпись });
    setФаза("done");
    звук.sfx(вид === "win" ? "победа" : вид === "lose" ? "поражение" : "клик");
    хаптикУведомление(вид === "win" ? "success" : вид === "lose" ? "error" : "warning");

    const ф = фраза(вид);
    занят.current = false;
    if (ф) { await пауза(А.репликаПослеИтогаМс); if (жив.current) показатьФразу(ф); }
  };

  const ходТорговца = async () => {
    setФаза("dealer");
    setЗакрыта(false);
    хаптик("medium");
    await пауза(А.переворотМс);
    if (!жив.current) return;
    const ничьяСразу = очки(рИ.current).сумма > 21 || блэкджек(рИ.current) || блэкджек(рТ.current);
    if (!ничьяСразу) {
      while (торговецБерёт(рТ.current)) {
        взять("т");
        await пауза(А.доборТорговцаМс);
        if (!жив.current) return;
      }
    }
    await завершить();
  };

  const раздать = async () => {
    if (занят.current) return;
    занят.current = true;
    setОшибка("");
    if (рИ.current.length || рТ.current.length) {
      setИтог(null);
      setРеплика(null);
      setУходят(true);
      await пауза(А.сбросМс);
      if (!жив.current) return;
    }
    рИ.current = [];
    рТ.current = [];
    setУходят(false);
    setИгрок([]);
    setТорговец([]);
    setЗакрыта(true);
    setИтог(null);
    setФаза("dealing");
    стат("plays_blackjack");
    колода.current = новаяКолода();

    await пауза(150);
    for (const кому of ["и", "т", "и", "т"] as const) {
      if (!жив.current) return;
      взять(кому);
      await пауза(А.раздачаМс);
    }
    if (!жив.current) return;
    if (блэкджек(рИ.current) || блэкджек(рТ.current)) { await ходТорговца(); return; }
    setФаза("player");
    занят.current = false;
  };

  const ещё = async () => {
    if (фаза !== "player" || занят.current) return;
    занят.current = true;
    взять("и");
    await пауза(А.раздачаМс);
    if (!жив.current) return;
    const сумма = очки(рИ.current).сумма;
    if (сумма >= 21) await ходТорговца();
    else занят.current = false;
  };

  const стоп = async () => {
    if (фаза !== "player" || занят.current) return;
    занят.current = true;
    хаптик("light");
    await ходТорговца();
  };

  if (!user) return null;

  const отступ = getSafeTop();
  const cw = Math.max(62, Math.min(84, Math.round(размер.w * 0.19)));
  const ch = Math.round(cw * 1.42);
  const выступ = 56;
  const высотаСцены = Math.max(170, Math.min(270, размер.h - 490 - отступ));
  const видимыеТорговца = торговец.filter((_, i) => !(закрыта && i === 1));
  const играем = фаза === "player";
  const цветИтога = !итог ? "" : итог.вид === "win" ? "#C6F23A" : итог.вид === "lose" ? "#FF8A70" : "#FFFFFF";
  const фонИтога = !итог ? "" : итог.вид === "win" ? "rgba(155,219,18,.16)" : итог.вид === "lose" ? "rgba(240,54,26,.16)" : "rgba(255,255,255,.1)";
  const заголовокИтога = !итог ? "" : итог.вид === "win" ? ТБ.итог.победа : итог.вид === "lose" ? ТБ.итог.поражение : ТБ.итог.ничья;
  const строкаСдвига = !итог ? "" : дельта && итог.вид !== "push"
    ? ТБ.дельта(дельта.v)
    : итог.вид === "win" ? ТБ.лимитМин : итог.вид === "lose" ? ТБ.лимитМакс : "";

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden" style={{ background: "radial-gradient(ellipse at 50% 35%, #25262c 0%, #151619 58%, #0b0b0d 100%)" }}>
      <div style={{ height: отступ }} />

      <div className="relative z-10">
        <MerchantStage процент={комиссия} высота={высотаСцены} выступ={выступ} дельта={дельта}>
          <button onClick={() => { звук.sfx("клик"); navigate("/exchange"); }}
            className="absolute right-3.5 top-3 z-30 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold text-white/90 backdrop-blur">
            {ТБ.назад}
          </button>
          {реплика && (
            <div key={реплика.id} className="bj-bubble absolute z-30" style={{ left: 10, top: "30%", width: "46%", ["--show" as any]: `${БЛЭКДЖЕК.показФразыСек}s` }}>
              <SpeechBubble text={реплика.текст} />
            </div>
          )}
        </MerchantStage>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col items-center px-4" style={{ paddingTop: выступ + 14, paddingBottom: "max(18px, env(safe-area-inset-bottom))" }}>
        <div id="bj-deck" className="absolute" style={{ top: 22, right: 18, width: cw, height: ch }}>
          <div className="absolute" style={{ left: 4, top: 4 }}><CardBack w={cw} /></div>
          <div className="absolute" style={{ left: 2, top: 2 }}><CardBack w={cw} /></div>
          <div className="absolute" style={{ left: 0, top: 0 }}><CardBack w={cw} /></div>
        </div>

        <Рука карты={торговец} cw={cw} ширина={размер.w} вверх={false} скрытьВторую={закрыта} уходит={уходят}
          подсказка={видимыеТорговца.length ? очки(видимыеТорговца).сумма : null} />

        <div className="flex h-[52px] items-center justify-center">
          {итог && (
            <div className="bj-pop rounded-2xl px-4 py-1.5 text-center" style={{ background: фонИтога, color: цветИтога, border: `1px solid ${цветИтога}55` }}>
              <div className="text-sm font-extrabold leading-tight">{итог.подпись ? `${итог.подпись} ` : ""}{заголовокИтога}</div>
              {строкаСдвига && <div className="text-[11px] font-semibold opacity-80">{строкаСдвига}</div>}
            </div>
          )}
        </div>

        <Рука карты={игрок} cw={cw} ширина={размер.w} вверх={true} скрытьВторую={false} уходит={уходят}
          подсказка={игрок.length ? очки(игрок).сумма : null} />

        {ошибка && <p className="mt-2 text-center text-xs text-red-300">{ошибка}</p>}

        <div className="mt-auto flex justify-center gap-3">
          {фаза === "done" ? (
            <button onClick={раздать} className="btn btn-blue h-[76px] w-[212px] text-base">{ТБ.новаяРаздача}</button>
          ) : (
            <>
              <button onClick={стоп} disabled={!играем}
                className="flex h-[76px] w-[100px] flex-col items-center justify-center gap-1 rounded-2xl font-extrabold text-white transition active:scale-95 disabled:opacity-45"
                style={{ background: "linear-gradient(180deg,#FF5C2E 0%,#EE3419 100%)", boxShadow: "0 6px 18px rgba(238,52,25,.28)" }}>
                <span className="text-[26px] leading-none" style={{ filter: "brightness(0) invert(1)" }}>✋</span>
                <span className="text-sm">{ТБ.стоп}</span>
              </button>
              <button onClick={ещё} disabled={!играем}
                className="flex h-[76px] w-[100px] flex-col items-center justify-center gap-1 rounded-2xl font-extrabold transition active:scale-95 disabled:opacity-45"
                style={{ background: "linear-gradient(180deg,#C9F23C 0%,#9CDB14 100%)", color: "#1B2A00", boxShadow: "0 6px 18px rgba(156,219,20,.25)" }}>
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="7" width="14" height="17" rx="3" />
                  <rect x="9" y="3" width="14" height="17" rx="3" fill="#B6E92A" />
                  <path d="M16 8.5v8M12 12.5h8" />
                </svg>
                <span className="text-sm">{ТБ.ещё}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

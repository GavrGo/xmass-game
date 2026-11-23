import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Modal from "./Modal";
import { Иконка, Картинка } from "./Icon";
import { Т } from "../texts";
import { СЛОТ, ОПЫТ_СЛОТА, СИМВОЛЫ_СЛОТА, путьКартинкиСимвола } from "../config";
import { уровеньОпытаСлота } from "../game/slotXp";

type Искра = { id: number; x: number; dx: number; dy: number; размер: number; тип: "падает" | "взрыв" };

const CSS = `
@keyframes slotXpFall { 0% { transform: translate(0,0); opacity: 1 } 100% { transform: translate(var(--dx), var(--dy)); opacity: 0 } }
@keyframes slotXpBurst { 0% { transform: translate(0,0) scale(1); opacity: 1 } 100% { transform: translate(var(--dx), var(--dy)) scale(.4); opacity: 0 } }
@keyframes slotXpGlow { 0%,100% { opacity: .6 } 50% { opacity: 1 } }
@keyframes slotXpFlash { 0% { box-shadow: 0 0 0 0 rgba(255,200,58,.95); opacity: 1 } 100% { box-shadow: 0 0 26px 12px rgba(255,200,58,0); opacity: 0 } }
.slot-xp-spark { position: absolute; top: 50%; border-radius: 9999px; background: #FFE58A; box-shadow: 0 0 4px #FFC83A; pointer-events: none; }
.slot-xp-spark-fall { animation: slotXpFall .8s linear forwards; }
.slot-xp-spark-burst { background: #FFF3B0; animation: slotXpBurst .75s ease-out forwards; }
.slot-xp-glow { animation: slotXpGlow .5s ease-in-out infinite; }
.slot-xp-flash { animation: slotXpFlash .6s ease-out forwards; }
`;

export default function SlotXpBar({ спинов, активна }: { спинов: number; активна: boolean }) {
  const [открыт, setОткрыт] = useState(false);
  const [искры, setИскры] = useState<Искра[]>([]);
  const [вспышка, setВспышка] = useState(0);
  const у = уровеньОпытаСлота(спинов);
  const процент = у.прогресс * 100;
  const счётчик = useRef(0);
  const прогрессRef = useRef(процент);
  прогрессRef.current = процент;
  const прошлыйУровень = useRef<number | null>(null);

  const убрать = (ids: number[], через: number) =>
    setTimeout(() => setИскры((p) => p.filter((s) => !ids.includes(s.id))), через);

  // Взрыв при переходе на новый уровень: вспышка и искры во все стороны от правого края
  useEffect(() => {
    const пред = прошлыйУровень.current;
    прошлыйУровень.current = у.уровень;
    if (пред === null || у.уровень <= пред) return;
    setВспышка((n) => n + 1);
    const новые: Искра[] = Array.from({ length: 16 }, (_, i) => {
      const угол = (i / 16) * Math.PI * 2 + Math.random() * 0.3;
      const дистанция = 40 + Math.random() * 40;
      return {
        id: ++счётчик.current, x: 100,
        dx: Math.cos(угол) * дистанция, dy: Math.sin(угол) * дистанция,
        размер: 3 + Math.random() * 2, тип: "взрыв",
      };
    });
    setИскры((p) => [...p, ...новые]);
    убрать(новые.map((n) => n.id), 900);
  }, [у.уровень]);

  // Лёгкие искры с кончика, пока слот крутится
  useEffect(() => {
    if (!активна) return;
    const т = setInterval(() => {
      if (прогрессRef.current <= 0) return;
      const id = ++счётчик.current;
      setИскры((p) => [
        ...p.slice(-12),
        { id, x: прогрессRef.current, dx: (Math.random() - 0.5) * 10, dy: 10 + Math.random() * 14, размер: 2 + Math.random() * 1.5, тип: "падает" },
      ]);
      убрать([id], 800);
    }, 180);
    return () => clearInterval(т);
  }, [активна]);

  return (
    <>
      <style>{CSS}</style>
      <div className="relative h-full w-full">
        <button
          onClick={() => setОткрыт(true)}
          aria-label="Опыт слота"
          className="relative flex h-full w-full items-center overflow-hidden rounded-full bg-black/50 ring-1 ring-white/15 active:scale-[0.98]"
        >
          <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-[width] duration-500" style={{ width: `${процент}%` }} />
          <span className="absolute inset-0 flex items-center justify-center text-xs font-extrabold text-white drop-shadow">{у.уровень}</span>
        </button>

        {активна && процент > 0 && (
          <div
            className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300/80 blur-[4px] slot-xp-glow"
            style={{ left: `${процент}%` }}
          />
        )}
        {вспышка > 0 && <div key={вспышка} className="pointer-events-none absolute inset-0 rounded-full slot-xp-flash" />}
        {искры.map((s) => (
          <span
            key={s.id}
            className={`slot-xp-spark ${s.тип === "падает" ? "slot-xp-spark-fall" : "slot-xp-spark-burst"}`}
            style={{
              left: `${s.x}%`, width: s.размер, height: s.размер, marginTop: -s.размер / 2, marginLeft: -s.размер / 2,
              ["--dx" as any]: `${s.dx}px`, ["--dy" as any]: `${s.dy}px`,
            }}
          />
        ))}
      </div>

      {открыт && createPortal(
        <Modal тон="calm" onClose={() => setОткрыт(false)}>
          <h3 className="text-lg font-bold">Опыт слота</h3>
          <p className="mb-4 text-xs text-white/60">Прокачка влияет только на получаемые сердца.</p>
          <div className="mb-1.5 flex items-baseline justify-between text-sm font-bold">
            <span>Ур. {у.уровень}</span>
            <span className="tabular-nums">{у.следующийПорог !== null ? `${спинов}/${у.следующийПорог}` : "Макс"}</span>
          </div>
          <div className="mb-4 h-2.5 overflow-hidden rounded-full bg-black/40 ring-1 ring-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-yellow-400 transition-[width] duration-500" style={{ width: `${Math.round(у.прогресс * 100)}%` }} />
          </div>
          <ul className="space-y-1.5 text-left text-xs">
            {ОПЫТ_СЛОТА.спинов.map((порог, i) => {
              const ур = i + 1;
              const пройден = ур < у.уровень;
              const текущий = ур === у.уровень;
              const новые = СИМВОЛЫ_СЛОТА.filter((с) => с.открытьНаУровне === ур);
              return (
                <li
                  key={ур}
                  className={`rounded-xl px-3 py-2 ${текущий ? "bg-amber-300/20 ring-1 ring-amber-300/70" : пройден ? "opacity-35" : "bg-white/5"}`}
                >
                  <div className={`flex items-center justify-between gap-2 ${пройден ? "line-through" : ""}`}>
                    <span className="font-bold">Ур. {ур}</span>
                    <span className="text-white/60">{порог} спинов</span>
                    <span className="inline-flex items-center gap-1 font-bold text-amber-200">
                      ×{ОПЫТ_СЛОТА.множители[i]} · {Math.round(СЛОТ.хэпэшекЗаТриСердца * ОПЫТ_СЛОТА.множители[i])}
                      <Иконка имя="хэпэшки" размер={14} />
                    </span>
                  </div>
                  {новые.map((с) => (
                    <div key={с.id} className="mt-1 text-[11px] font-semibold text-emerald-300">
                      + <Картинка путь={путьКартинкиСимвола(с.id)} fallback={<span>{с.эмодзи}</span>} className="inline-block h-4 w-4 object-contain align-[-3px]" /> {Т.слот.родительный[с.id] ?? с.id}
                    </div>
                  ))}
                </li>
              );
            })}
          </ul>
        </Modal>,
        document.body,
      )}
    </>
  );
}

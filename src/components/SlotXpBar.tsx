import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Modal from "./Modal";
import { Иконка } from "./Icon";
import { СЛОТ, ОПЫТ_СЛОТА } from "../config";
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
        <Modal onClose={() => setОткрыт(false)}>
          <h3 className="mb-1 text-lg font-bold">Опыт слота</h3>
          <p className="mb-3 text-xs text-muted">Каждый спин даёт опыт. На 4, 7 и 10 уровнях в барабан добавляются новые символы: коробка фишек, пачка билетов и мешок подарков. Чем выше уровень, тем больше сердец за выигрыш.</p>
          <div className="mb-3 text-sm font-semibold">
            Уровень {у.уровень} · {спинов} спинов
            {у.следующийПорог !== null ? ` · до ${у.уровень + 1} ур. ещё ${у.следующийПорог - спинов}` : " · максимум"}
          </div>
          <ul className="space-y-1 text-left text-xs">
            {ОПЫТ_СЛОТА.спинов.map((порог, i) => (
              <li key={i} className={`flex justify-between rounded-lg px-2 py-1 ${i + 1 === у.уровень ? "bg-white/15 font-bold" : "text-muted"}`}>
                <span>Ур. {i + 1} · от {порог} спинов</span>
                <span className="inline-flex items-center gap-1">
                  ×{ОПЫТ_СЛОТА.множители[i]} · {Math.round(СЛОТ.хэпэшекЗаТриСердца * ОПЫТ_СЛОТА.множители[i])}
                  <Иконка имя="хэпэшки" размер={14} />
                </span>
              </li>
            ))}
          </ul>
        </Modal>,
        document.body,
      )}
    </>
  );
}

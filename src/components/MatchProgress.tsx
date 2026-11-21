import { forwardRef, useEffect, useRef, useState } from "react";

const CSS = `
@keyframes mp-spark { 0% { transform: translate(0,0) scale(1); opacity: 1 } 100% { transform: translate(var(--dx), var(--dy)) scale(.2); opacity: 0 } }
@keyframes mp-glow { 0%,100% { opacity: .6 } 50% { opacity: 1 } }
.mp-spark { position: absolute; top: 50%; border-radius: 9999px; background: #FFF3B0; box-shadow: 0 0 4px #FFC83A; pointer-events: none; animation: mp-spark .6s ease-out forwards; }
.mp-glow { animation: mp-glow .5s ease-in-out infinite; }
`;

interface Искра { id: number; dx: number; dy: number; размер: number }

const ПолосаОчков = forwardRef<HTMLDivElement, { доля: number; импульс: number }>(function ПолосаОчков({ доля, импульс }, ref) {
  const [искры, setИскры] = useState<Искра[]>([]);
  const счётчик = useRef(0);
  const прошлый = useRef(импульс);
  const процент = Math.min(100, доля * 100);

  useEffect(() => {
    if (импульс === прошлый.current) return;
    прошлый.current = импульс;
    const новые: Искра[] = Array.from({ length: 6 }, () => {
      const угол = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
      const дист = 14 + Math.random() * 16;
      return { id: ++счётчик.current, dx: Math.cos(угол) * дист, dy: Math.sin(угол) * дист, размер: 3 + Math.random() * 2 };
    });
    setИскры((п) => [...п.slice(-12), ...новые]);
    const ids = новые.map((n) => n.id);
    setTimeout(() => setИскры((п) => п.filter((s) => !ids.includes(s.id))), 650);
  }, [импульс]);

  return (
    <>
      <style>{CSS}</style>
      <div ref={ref} className="relative h-3 w-full rounded-full bg-black/50 ring-1 ring-white/15">
        <div className="absolute inset-0 overflow-hidden rounded-full">
          <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-[width] duration-500 ease-out" style={{ width: `${процент}%` }} />
        </div>
        {процент > 0 && (
          <div className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300/80 blur-[3px] mp-glow" style={{ left: `${процент}%` }} />
        )}
        {искры.map((s) => (
          <span
            key={s.id}
            className="mp-spark"
            style={{
              left: `${процент}%`, width: s.размер, height: s.размер, marginTop: -s.размер / 2, marginLeft: -s.размер / 2,
              ["--dx" as any]: `${s.dx}px`, ["--dy" as any]: `${s.dy}px`,
            }}
          />
        ))}
      </div>
    </>
  );
});

export default ПолосаОчков;

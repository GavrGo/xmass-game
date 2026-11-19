import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { КОЛЕСО, ЧЁРНЫЙ_РЫНОК } from "../config";
import { Т } from "../texts";
import { естьФайл } from "../lib/assets";
import type { Сектор } from "../game/wheel";
import SpeechBubble from "./SpeechBubble";

const R = 88;
const ЛАМПОЧЕК = 20;
const ЗОЛОТО = ЧЁРНЫЙ_РЫНОК.колесоX100.множитель;

const точка = (угол: number, r: number) => {
  const a = (угол * Math.PI) / 180;
  return [100 + r * Math.sin(a), 100 - r * Math.cos(a)] as const;
};
const путьСектора = (от: number, до: number, r: number) => {
  const [x1, y1] = точка(от, r), [x2, y2] = точка(до, r);
  return `M100,100 L${x1},${y1} A${r},${r} 0 ${до - от > 180 ? 1 : 0} 1 ${x2},${y2} Z`;
};

export function Череп({ размер }: { размер: number }) {
  if (естьФайл("assets/icons/wheel-skull.png") === true) {
    return <img src="/assets/icons/wheel-skull.png" width={размер} height={размер} alt="" draggable={false} />;
  }
  return (
    <svg width={размер} height={размер} viewBox="-12 -10 24 24" aria-hidden>
      <path d="M-10,2 C-12,-12 12,-12 10,2 L10,6 C10,8 8,9 6,9 L6,12 L-6,12 L-6,9 C-8,9 -10,8 -10,6 Z" fill="#F4F4F5" />
      <circle cx="-4" cy="0" r="2.8" fill="#1B1B22" />
      <circle cx="4" cy="0" r="2.8" fill="#1B1B22" />
      <path d="M0,3 L-1.5,6 L1.5,6 Z" fill="#1B1B22" />
      <path d="M-3,9 V12 M0,9 V12 M3,9 V12" stroke="#1B1B22" strokeWidth="0.8" />
    </svg>
  );
}

const Замок = ({ размер }: { размер: number }) => (
  <svg width={размер} height={размер} viewBox="0 0 16 16" fill="none" aria-hidden>
    <rect x="3" y="7" width="10" height="7.5" rx="2" fill="#9AA0AB" />
    <path d="M5.3 7V5.2a2.7 2.7 0 0 1 5.4 0V7" stroke="#9AA0AB" strokeWidth="1.6" strokeLinecap="round" />
    <circle cx="8" cy="10.6" r="1.2" fill="#2A2B32" />
  </svg>
);

/**
 * Колесо целиком: неподвижная рамка с мигающими лампочками, вращающийся диск, блик, втулка и указатель.
 * Размер задаёт родитель (квадратный контейнер); указательRef — элемент, который родитель «щёлкает» при проходе границ секторов.
 */
export function Колесо({ секторы, поворот, идёт, секунд, указательRef, дискRef }: {
  секторы: Сектор[]; поворот: number; идёт: boolean; секунд: number;
  указательRef: RefObject<HTMLDivElement>; дискRef: RefObject<HTMLDivElement>;
}) {
  const id = useId().replace(/:/g, "");
  const лампочки = useMemo(
    () => Array.from({ length: ЛАМПОЧЕК }, (_, i) => {
      const [x, y] = точка((i + 0.5) * (360 / ЛАМПОЧЕК), 94);
      return { i, x, y };
    }),
    []
  );
  const золотой = секторы.find((с) => с.золотой);
  const искры = useMemo(
    () => Array.from({ length: 5 }, () => ({
      x: (Math.random() * 2 - 1) * 1.2,
      y: 80 + Math.random() * 7,
      dx: Math.random() * 26 - 13,
      dy: -(16 + Math.random() * 16),
      dur: 6 + Math.random() * 4,
      задержка: -Math.random() * 10,
      r: 0.8 + Math.random() * 0.9,
    })),
    []
  );

  return (
    <div className={`absolute inset-0 ${идёт ? "wheel-spinning" : ""}`}>
      {/* Рамка */}
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" style={{ filter: "drop-shadow(0 10px 16px rgba(0,0,0,.6))" }}>
        <defs>
          <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFE9A0" />
            <stop offset=".35" stopColor="#D9A21B" />
            <stop offset=".7" stopColor="#7A5200" />
            <stop offset="1" stopColor="#F2C94C" />
          </linearGradient>
          <radialGradient id={`${id}-bulb`} cx=".4" cy=".35" r=".7">
            <stop offset="0" stopColor="#FFFBE0" />
            <stop offset=".5" stopColor="#FFE680" />
            <stop offset="1" stopColor="#FFB800" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="99.4" fill="#1B1205" />
        <circle cx="100" cy="100" r="94" fill="none" stroke={`url(#${id}-rim)`} strokeWidth="10.5" />
        <circle cx="100" cy="100" r="99.1" fill="none" stroke="#3A2A08" strokeWidth=".8" />
        <circle cx="100" cy="100" r="88.7" fill="none" stroke="rgba(0,0,0,.6)" strokeWidth="1.6" />
        {лампочки.map(({ i, x, y }) => (
          <g key={i} style={{ ["--i" as any]: i, ["--par" as any]: i % 2 }}>
            <circle cx={x} cy={y} r="4.6" fill="#FFC400" className="wheel-bulb-halo" />
            <circle cx={x} cy={y} r="2.5" fill="#6A5115" />
            <circle cx={x} cy={y} r="2.5" fill={`url(#${id}-bulb)`} className="wheel-bulb-lit" />
          </g>
        ))}
      </svg>

      {/* Вращающийся диск; overflow виден, чтобы золотые искры вылетали за рамку */}
      <div
        ref={дискRef}
        className="absolute inset-0"
        style={{
          transform: `rotate(${поворот}deg)`,
          transition: идёт ? `transform ${секунд}s cubic-bezier(0.12, 0.72, 0.1, 1)` : "none",
        }}
      >
        <svg viewBox="0 0 200 200" className="h-full w-full" style={{ overflow: "visible" }}>
          <defs>
            <radialGradient id={`${id}-gold`} cx="100" cy="100" r={R} gradientUnits="userSpaceOnUse">
              <stop offset=".25" stopColor="#FFAE00" />
              <stop offset=".7" stopColor="#FFD54A" />
              <stop offset="1" stopColor="#FFF0A0" />
            </radialGradient>
            <radialGradient id={`${id}-shade`} cx="100" cy="100" r={R} gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="rgba(0,0,0,0)" />
              <stop offset=".72" stopColor="rgba(0,0,0,0)" />
              <stop offset="1" stopColor="rgba(0,0,0,.28)" />
            </radialGradient>
            <filter id={`${id}-blur`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6" /></filter>
          </defs>
          <circle cx="100" cy="100" r={R} fill="#2A2B32" />
          {секторы.map((с, i) => {
            const заливка = с.золотой
              ? `url(#${id}-gold)`
              : с.множитель === 0 ? КОЛЕСО.цветЧерепа : КОЛЕСО.цветаСекторов[String(с.множитель)] ?? "#666";
            return (
              <path key={i} d={путьСектора(с.от, с.до, R)} fill={заливка} stroke="#0F0F11" strokeWidth={с.золотой ? 0.4 : 0.8} />
            );
          })}
          <circle cx="100" cy="100" r={R} fill={`url(#${id}-shade)`} pointerEvents="none" />
          {золотой && (
            <g>
              <path d={путьСектора(золотой.от, золотой.до, R)} fill="none" stroke="#FFD76A" strokeWidth="2" filter={`url(#${id}-blur)`} className="wheel-gold-glow" />
              <g transform={`rotate(${(золотой.от + золотой.до) / 2} 100 100)`}>
                {искры.map((и, k) => (
                  <circle
                    key={k} cx={100 + и.x} cy={100 - и.y} r={и.r} fill="#FFE27A" className="wheel-gold-spark"
                    style={{ ["--dx" as any]: `${и.dx}px`, ["--dy" as any]: `${и.dy}px`, ["--dur" as any]: `${и.dur}s`, ["--delay" as any]: `${и.задержка}s` }}
                  />
                ))}
              </g>
            </g>
          )}
        </svg>
      </div>

      {/* Блик и втулка (не вращаются) */}
      <svg viewBox="0 0 200 200" className="pointer-events-none absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id={`${id}-gloss`} cx=".33" cy=".25" r=".75">
            <stop offset="0" stopColor="rgba(255,255,255,.2)" />
            <stop offset=".6" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r={R} fill={`url(#${id}-gloss)`} />
        <circle cx="100" cy="100" r="17" fill={`url(#${id}-rim)`} stroke="#5B4000" strokeWidth="2.5" />
        <circle cx="100" cy="100" r="11" fill="#2A1D04" />
        <circle cx="100" cy="100" r="4.5" fill={`url(#${id}-bulb)`} />
      </svg>

      {/* Указатель: качается, когда по нему бьют сектора */}
      <div className="pointer-events-none absolute left-1/2 top-0 z-20 w-[14%] -translate-x-1/2 -translate-y-[40%]" style={{ filter: "drop-shadow(0 4px 5px rgba(0,0,0,.55))" }}>
        <div ref={указательRef} style={{ transformOrigin: "50% 33%" }}>
          <svg viewBox="0 0 36 52" className="block w-full" aria-hidden>
            <defs>
              <linearGradient id={`${id}-ptr`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#FFE27A" />
                <stop offset="1" stopColor="#E8A400" />
              </linearGradient>
              <radialGradient id={`${id}-jewel`} cx=".35" cy=".3" r=".75">
                <stop offset="0" stopColor="#FF9A90" />
                <stop offset="1" stopColor="#D81B36" />
              </radialGradient>
            </defs>
            <path d="M18 51 C16 44 5 28 5 17 A13 13 0 0 1 31 17 C31 28 20 44 18 51 Z" fill={`url(#${id}-ptr)`} stroke="#6B4A00" strokeWidth="1.6" strokeLinejoin="round" />
            <circle cx="18" cy="17" r="6.2" fill={`url(#${id}-jewel)`} stroke="#7A0E1E" strokeWidth="1" />
            <ellipse cx="16.2" cy="14.8" rx="1.8" ry="1.2" fill="rgba(255,255,255,.7)" />
          </svg>
        </div>
      </div>
    </div>
  );
}

/** Плашка над колесом: коэффициент сектора, на который сейчас указывает стрелка. */
export function ПоказательСектора({ сектор }: { сектор: Сектор }) {
  const череп = сектор.множитель === 0;
  const золото = !!сектор.золотой;
  const цвет = золото ? "#FFC83A" : череп ? КОЛЕСО.цветЧерепа : КОЛЕСО.цветаСекторов[String(сектор.множитель)] ?? "#666";
  return (
    <div
      className={`flex h-10 min-w-[104px] items-center justify-center gap-2.5 rounded-full px-4 ring-1 backdrop-blur ${золото ? "wheel-gold-pill" : ""}`}
      style={{
        background: золото ? "rgba(255,200,58,.2)" : "rgba(0,0,0,.55)",
        ["--tw-ring-color" as any]: золото ? "rgba(255,216,106,.7)" : "rgba(255,255,255,.18)",
        transition: "background .12s",
      }}
      aria-live="off"
    >
      <span
        className="h-4 w-4 shrink-0 rounded-full ring-1 ring-white/40"
        style={{ background: золото ? "radial-gradient(circle at 35% 30%, #FFF4B0, #FFB800)" : цвет, boxShadow: `0 0 8px ${цвет}99` }}
      />
      {череп ? <Череп размер={20} /> : (
        <span className="text-lg font-black leading-none tabular-nums" style={{ color: золото ? "#FFD95E" : "#fff" }}>{Т.колесо.множитель(сектор.множитель)}</span>
      )}
    </div>
  );
}

function Плашка({ кружок, children, className = "" }: { кружок: string; children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 rounded-full bg-white/10 py-1 pl-1.5 pr-2.5 text-xs font-bold text-white ${className}`}>
      <span className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-white/30" style={{ background: кружок }} />
      {children}
    </div>
  );
}

/** Подписи секторов под колесом: цветной кружок + множитель. Золотая плашка — артефакт x100 (до покупки закрыта замком). */
export function ЛегендаКолеса({ сX100 }: { сX100: boolean }) {
  const ТК = Т.колесо;
  const [подсказка, setПодсказка] = useState(0);
  const таймер = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(таймер.current), []);

  const множители = useMemo(() => [...new Set(КОЛЕСО.сектора.filter((м) => м > 0))].sort((a, b) => a - b), []);

  const показать = () => {
    setПодсказка((n) => n + 1);
    clearTimeout(таймер.current);
    таймер.current = setTimeout(() => setПодсказка(0), 3200);
  };

  return (
    <div className="mt-4 flex max-w-[330px] flex-wrap items-center justify-center gap-1.5">
      {множители.map((м) => (
        <Плашка key={м} кружок={КОЛЕСО.цветаСекторов[String(м)] ?? "#666"}>{ТК.множитель(м)}</Плашка>
      ))}
      <Плашка кружок={КОЛЕСО.цветЧерепа}><Череп размер={14} /></Плашка>
      {сX100 ? (
        <div className="wheel-gold-pill flex items-center gap-1.5 rounded-full py-1 pl-1.5 pr-2.5 text-xs font-extrabold" style={{ background: "rgba(255,200,58,.16)", color: "#FFD95E" }}>
          <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ background: "radial-gradient(circle at 35% 30%, #FFF4B0, #FFB800)" }} />
          {ТК.множитель(ЗОЛОТО)}
        </div>
      ) : (
        <div className="relative">
          <button
            onClick={показать}
            aria-label={ТК.замокПодпись}
            className="flex items-center gap-1.5 rounded-full bg-black/55 py-1 pl-1.5 pr-2.5 text-xs font-bold text-white/60 ring-1 ring-white/10 active:scale-95"
          >
            <span className="h-3.5 w-3.5 shrink-0 rounded-full bg-[#15151A] ring-1 ring-white/15" />
            <Замок размер={13} />
          </button>
          {подсказка > 0 && (
            <div className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-[220px] max-w-[80vw] -translate-x-1/2">
              <div key={подсказка} className="wheel-bubble"><SpeechBubble text={ТК.замок} /></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

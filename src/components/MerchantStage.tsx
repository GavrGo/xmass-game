import { useMemo } from "react";
import type { ReactNode } from "react";
import { АССЕТЫ } from "../config";
import { Картинка } from "./Icon";

/**
 * Сцена торговца: большой процент комиссии сзади, мерцающий красный «огонь», красные искры и сам торговец поверх.
 * высота — высота сцены в px; выступ — на сколько px торговец «вылезает» за нижнюю границу (поверх стола).
 */
export default function MerchantStage({
  процент, высота, выступ = 0, диск = false, дельта, children,
}: {
  процент: number; высота: number; выступ?: number; диск?: boolean;
  дельта?: { id: number; v: number } | null; children?: ReactNode;
}) {
  const искры = useMemo(
    () => Array.from({ length: 18 }, () => ({
      left: 6 + Math.random() * 88,
      размер: 2 + Math.random() * 3,
      задержка: -Math.random() * 7,
      длит: 3.4 + Math.random() * 3.4,
      дрейф: Math.round(Math.random() * 70 - 35),
      подъём: 90 + Math.random() * 150,
    })),
    []
  );

  return (
    <div className="relative w-full" style={{ height: высота }}>
      <div className="absolute inset-0 overflow-hidden">
        <div className="bj-flame absolute inset-0" style={{ background: "radial-gradient(ellipse 75% 85% at 50% 75%, rgba(214,32,40,.55), rgba(120,10,20,.25) 55%, transparent 80%)" }} />
        <div className="bj-flame bj-flame-b absolute inset-0" style={{ background: "radial-gradient(ellipse 45% 60% at 30% 90%, rgba(255,70,40,.35), transparent 70%), radial-gradient(ellipse 45% 60% at 72% 95%, rgba(230,40,60,.3), transparent 70%)" }} />
        {диск && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ width: высота * 0.95, height: высота * 0.95, background: "radial-gradient(circle, rgba(200,28,40,.5) 0%, rgba(110,10,20,.35) 60%, transparent 72%)" }} />
        )}
        <div className="pointer-events-none absolute inset-x-0 select-none text-center font-black" style={{ top: -высота * 0.04, fontSize: высота * 1.12, lineHeight: 0.85, whiteSpace: "nowrap" }}>
          <span key={процент} className="bj-pct inline-block"
            style={{ background: "linear-gradient(to bottom, rgba(170,24,34,.6) 0%, rgba(70,8,14,.3) 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {процент}%
          </span>
        </div>
        {искры.map((и, i) => (
          <span key={i} className="bj-spark" style={{
            left: `${и.left}%`, width: и.размер, height: и.размер,
            ["--delay" as any]: `${и.задержка}s`, ["--dur" as any]: `${и.длит}s`, ["--drift" as any]: `${и.дрейф}px`, ["--rise" as any]: `${и.подъём}px`,
          }} />
        ))}
      </div>

      <Картинка
        путь={АССЕТЫ.папки.персонажи + АССЕТЫ.персонажи.обмен}
        fallback={<div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-8xl">🎩</div>}
        className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 select-none object-contain"
        style={{ bottom: -выступ, height: высота + выступ, maxWidth: "92%", filter: "drop-shadow(0 10px 22px rgba(0,0,0,.55))" }}
      />

      {дельта && (
        <span key={дельта.id} className="bj-delta pointer-events-none absolute z-20 text-3xl font-black"
          style={{ right: 20, top: "34%", color: дельта.v < 0 ? "#8CFF8F" : "#FF6B6B", textShadow: "0 2px 10px rgba(0,0,0,.7)" }}>
          {дельта.v > 0 ? "+" : "−"}{Math.abs(дельта.v)}%
        </span>
      )}
      {children}
    </div>
  );
}

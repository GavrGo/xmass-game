import { useMemo } from "react";
import type { ReactNode } from "react";
import { АССЕТЫ, РАСКЛАДКА_ТОРГОВЦА } from "../config";
import { Картинка } from "./Icon";

// Плавная маска: smoothstep вместо линейной, чтобы у края не было заметной полосы
function маскаЗатухания(сверху: number, снизу: number): string | undefined {
  if (сверху <= 0 && снизу <= 0) return undefined;
  const ступени = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
  const сглажено = (t: number) => t * t * (3 - 2 * t);
  const стопы: string[] = [];
  if (сверху > 0) ступени.forEach((t) => стопы.push(`rgba(0,0,0,${сглажено(t).toFixed(3)}) ${(t * сверху).toFixed(1)}%`));
  else стопы.push("#000 0%");
  if (снизу > 0) ступени.forEach((t) => стопы.push(`rgba(0,0,0,${(1 - сглажено(t)).toFixed(3)}) ${(100 - снизу + t * снизу).toFixed(1)}%`));
  else стопы.push("#000 100%");
  return `linear-gradient(to bottom, ${стопы.join(", ")})`;
}

/**
 * Сцена торговца: большой процент комиссии сзади, мерцающий красный «огонь», красные искры и сам торговец поверх.
 * высота — высота сцены в px; выступ — на сколько px торговец «вылезает» за нижнюю границу (поверх стола).
 */
export default function MerchantStage({
  процент, высота, выступ = 0, диск = false, картинка = "обмен", дельта, children,
}: {
  процент: number; высота: number; выступ?: number; диск?: boolean; картинка?: "обмен" | "обменБлэкджек";
  дельта?: { id: number; v: number } | null; children?: ReactNode;
}) {
  const раскладка = РАСКЛАДКА_ТОРГОВЦА[картинка === "обмен" ? "магазин" : "блэкджек"];
  const маска = маскаЗатухания(раскладка.затуханиеСверху, раскладка.затуханиеСнизу);
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

  const шахматка = useMemo(() => {
    const точки: { x: number; y: number; задержка: number }[] = [];
    for (let r = 0; r < 7; r++) {
      const сдвиг = r % 2 ? 14 : 0;
      for (let c = -2; c <= 2; c++) {
        const x = 50 + сдвиг + c * 28;
        const y = 5 + r * 15;
        if (x < -12 || x > 112) continue;
        точки.push({ x, y, задержка: Math.hypot((x - 50) / 50, (y - 50) / 50) * 0.45 });
      }
    }
    return точки;
  }, []);

  return (
    <div className="relative w-full" style={{ height: высота }}>
      <div className="absolute inset-0 overflow-hidden">
        {картинка === "обменБлэкджек" ? шахматка.map((т, i) => (
          <div key={`${процент}-${i}`} className="pointer-events-none absolute select-none font-black"
            style={{ left: `${т.x}%`, top: `${т.y}%`, transform: "translate(-50%, -50%)", lineHeight: 1, whiteSpace: "nowrap" }}>
            <span className="bj-wave inline-block"
              style={{ fontSize: высота * 0.15, animationDelay: `${т.задержка}s`, background: "linear-gradient(to bottom, rgba(255,96,80,.42) 0%, rgba(120,12,22,.2) 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {процент}%
            </span>
          </div>
        )) : (
          <div key={процент} className="pointer-events-none absolute left-1/2 select-none font-black"
            style={{ top: 8, transform: "translateX(-50%)", lineHeight: 0.9, whiteSpace: "nowrap" }}>
            <span className="bj-pct inline-block"
              style={{ fontSize: "46vw", background: "linear-gradient(to bottom, rgba(255,96,80,.75) 0%, rgba(120,12,22,.35) 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {процент}%
            </span>
          </div>
        )}
        <div className="absolute inset-0" style={{ maskImage: маска, WebkitMaskImage: маска }}>
        <div className="bj-flame absolute inset-0" style={{ background: "radial-gradient(ellipse 75% 85% at 50% 75%, rgba(214,32,40,.55), rgba(120,10,20,.25) 55%, transparent 80%)" }} />
        <div className="bj-flame bj-flame-b absolute inset-0" style={{ background: "radial-gradient(ellipse 45% 60% at 30% 90%, rgba(255,70,40,.35), transparent 70%), radial-gradient(ellipse 45% 60% at 72% 95%, rgba(230,40,60,.3), transparent 70%)" }} />
        {диск && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ width: высота * 0.95, height: высота * 0.95, background: "radial-gradient(circle, rgba(200,28,40,.5) 0%, rgba(110,10,20,.35) 60%, transparent 72%)" }} />
        )}
        </div>
        {искры.map((и, i) => (
          <span key={i} className="bj-spark" style={{
            left: `${и.left}%`, width: и.размер, height: и.размер,
            ["--delay" as any]: `${и.задержка}s`, ["--dur" as any]: `${и.длит}s`, ["--drift" as any]: `${и.дрейф}px`, ["--rise" as any]: `${и.подъём}px`,
          }} />
        ))}
      </div>

      {(() => {
        const стиль = {
          left: `calc(50% + ${раскладка.x}px)`, bottom: -выступ - раскладка.y, height: высота + выступ, maxWidth: "92%",
          transform: `translateX(-50%) scale(${раскладка.масштаб / 100})`, transformOrigin: "50% 100%",
          filter: "drop-shadow(0 10px 22px rgba(0,0,0,.55))",
        };
        const класс = "pointer-events-none absolute z-10 select-none object-contain";
        const обычный = (
          <Картинка
            путь={АССЕТЫ.папки.персонажи + АССЕТЫ.персонажи.обмен}
            fallback={<div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-8xl">🎩</div>}
            className={класс} style={стиль}
          />
        );
        // Нет картинки «за столом» — показываем обычного торговца
        return картинка === "обменБлэкджек" ? (
          <Картинка путь={АССЕТЫ.папки.персонажи + АССЕТЫ.персонажи.обменБлэкджек} fallback={обычный} className={класс} style={стиль} />
        ) : обычный;
      })()}

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

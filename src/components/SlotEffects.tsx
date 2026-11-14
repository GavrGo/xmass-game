import { useMemo } from "react";

// Падающие эмодзи по всему экрану (конфетти): сердечки, монетки, билетики, подарки.
export function Конфетти({ эмодзи }: { эмодзи: string }) {
  const частицы = useMemo(
    () =>
      Array.from({ length: 36 }, () => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        dur: 1.8 + Math.random() * 1.4,
        size: 22 + Math.random() * 22,
        rot: Math.round(Math.random() * 720 - 360),
      })),
    []
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {частицы.map((ч, i) => (
        <span
          key={i}
          className="confetti absolute top-0"
          style={{
            left: `${ч.left}%`,
            fontSize: ч.size,
            animationDelay: `${ч.delay}s`,
            animationDuration: `${ч.dur}s`,
            ["--rot" as any]: `${ч.rot}deg`,
          }}
        >
          {эмодзи}
        </span>
      ))}
    </div>
  );
}

// Взрыв: вспышка, 💥 и затемнение радиальным градиентом от центра (сажа).
export function Взрыв() {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center overflow-hidden">
      <div className="boom-flash absolute inset-0 bg-white" />
      <div
        className="soot-fade absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(0,0,0,0.98) 0%, rgba(25,12,0,0.93) 35%, rgba(0,0,0,0.65) 70%, rgba(0,0,0,0.3) 100%)",
        }}
      />
      <div className="boom-emoji text-[8rem] leading-none">💥</div>
    </div>
  );
}

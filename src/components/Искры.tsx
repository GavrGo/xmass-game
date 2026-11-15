import { useMemo } from "react";

// Фиолетовые искры, поднимающиеся по экрану (как искры от огня).
export default function Искры({ количество, цвет }: { количество: number; цвет: string }) {
  const искры = useMemo(
    () =>
      Array.from({ length: количество }, () => ({
        left: Math.random() * 100,
        размер: 3 + Math.random() * 6,
        задержка: -Math.random() * 5,
        длительность: 2.8 + Math.random() * 3.2,
        дрейф: Math.round(Math.random() * 80 - 40),
      })),
    [количество]
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {искры.map((и, i) => (
        <span
          key={i}
          className="spark"
          style={{
            left: `${и.left}%`,
            width: и.размер,
            height: и.размер,
            background: `rgb(${цвет})`,
            boxShadow: `0 0 ${и.размер * 2.5}px ${и.размер / 2}px rgba(${цвет},0.75)`,
            animationDuration: `${и.длительность}s`,
            animationDelay: `${и.задержка}s`,
            ["--dx" as any]: `${и.дрейф}px`,
          }}
        />
      ))}
    </div>
  );
}

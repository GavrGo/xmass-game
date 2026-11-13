import { NavLink } from "react-router-dom";

// Порядок как на макете: Прокачка / Главная / Мини-игры / Обмен
const ПУНКТЫ = [
  { to: "/upgrades", иконка: "⚡", текст: "Прокачка" },
  { to: "/", иконка: "🎄", текст: "Главная" },
  { to: "/games", иконка: "🎮", текст: "Мини-игры" },
  { to: "/exchange", иконка: "🔄", текст: "Обмен" },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 flex border-t border-white/10 bg-xmas-dark/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      {ПУНКТЫ.map((п) => (
        <NavLink
          key={п.to}
          to={п.to}
          end
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center py-2 text-xs ${
              isActive ? "text-xmas-gold" : "text-white/60"
            }`
          }
        >
          <span className="text-2xl">{п.иконка}</span>
          {п.текст}
        </NavLink>
      ))}
    </nav>
  );
}

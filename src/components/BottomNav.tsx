import { NavLink } from "react-router-dom";
import { Т } from "../texts";
import { Иконка } from "./Иконка";
import { АССЕТЫ } from "../config";

// Порядок как на макете: Прокачка / Главная / Мини-игры / Обмен
const ПУНКТЫ: { to: string; иконка: keyof typeof АССЕТЫ.иконки; текст: string }[] = [
  { to: "/upgrades", иконка: "навПрокачка", текст: Т.навигация.прокачка },
  { to: "/", иконка: "навГлавная", текст: Т.навигация.главная },
  { to: "/games", иконка: "навИгры", текст: Т.навигация.миниИгры },
  { to: "/exchange", иконка: "навОбмен", текст: Т.навигация.обмен },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-2 left-3 right-3 z-10 mb-[env(safe-area-inset-bottom)] flex rounded-3xl border border-white/10 bg-[#18191E]/95 p-1.5 backdrop-blur">
      {ПУНКТЫ.map((п) => (
        <NavLink
          key={п.to}
          to={п.to}
          end
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-semibold transition ${
              isActive ? "bg-white/10 text-white" : "text-[#6E6F78]"
            }`
          }
        >
          <Иконка имя={п.иконка} размер={26} />
          {п.текст}
        </NavLink>
      ))}
    </nav>
  );
}

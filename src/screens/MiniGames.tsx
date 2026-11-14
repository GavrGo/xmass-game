import { Link } from "react-router-dom";
import { useUser } from "../store/UserContext";
import { КСЮХА_РАН } from "../config";

// Список мини-игр. Чтобы добавить новую — добавьте ещё один объект в этот список.
export default function MiniGames() {
  const { user } = useUser();
  if (!user) return null;

  const игры = [
    {
      путь: "/games/ksuha-run",
      эмодзи: "👧",
      название: "Ksuha Run",
      описание: `Бегите и прыгайте через препятствия. ${КСЮХА_РАН.препятствийЗаФишку} препятствий = 1 🪙`,
      рекорд: user.best_ksuha_run ?? 0,
    },
  ];

  return (
    <div className="p-4">
      <h2 className="mb-4 text-xl font-bold">Мини-игры</h2>
      <div className="flex flex-col gap-3">
        {игры.map((и) => (
          <Link key={и.путь} to={и.путь} className="flex items-center gap-4 rounded-2xl bg-white/10 p-4 active:bg-white/20">
            <div className="text-5xl">{и.эмодзи}</div>
            <div className="flex-1">
              <div className="text-lg font-bold">{и.название}</div>
              <div className="text-sm text-white/60">{и.описание}</div>
              <div className="mt-1 text-xs text-xmas-gold">Ваш рекорд: {и.рекорд} · вход бесплатный</div>
            </div>
            <div className="text-2xl text-white/40">›</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

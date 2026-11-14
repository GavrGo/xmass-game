import { Outlet, useLocation } from "react-router-dom";
import BottomNav from "./BottomNav";
import ВерхняяПанель from "./ВерхняяПанель";
import БалансыПилюли from "./БалансыПилюли";
import { стильФона, useАссеты } from "../lib/assets";
import { АССЕТЫ } from "../config";

const ФОНЫ: Record<string, keyof typeof АССЕТЫ.фоны> = {
  "/": "главная", "/games": "игры", "/upgrades": "прокачка", "/exchange": "обмен", "/leaderboard": "лидерборд",
};

// Общая рамка основных экранов: верхняя панель, (балансы), контент, нижнее меню, фон-картинка (если есть).
export default function Layout() {
  const { pathname } = useLocation();
  useАссеты();
  const ключФона = ФОНЫ[pathname];
  return (
    <div className="min-h-screen pb-28" style={ключФона ? стильФона(ключФона) : undefined}>
      <ВерхняяПанель />
      {/* На главном экране свои крупные балансы */}
      {pathname !== "/" && <БалансыПилюли />}
      <Outlet />
      <BottomNav />
    </div>
  );
}

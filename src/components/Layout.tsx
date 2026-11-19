import { Outlet, useLocation } from "react-router-dom";
import BottomNav from "./BottomNav";
import ДуэльнаяПлашка from "./DuelToast";
import { useFinalFreeze } from "../lib/useFinalFreeze";
import ВерхняяПанель from "./TopBar";
import БалансыПилюли from "./BalancePills";
import { стильФона, useАссеты } from "../lib/assets";
import { АССЕТЫ } from "../config";

const ФОНЫ: Record<string, keyof typeof АССЕТЫ.фоны> = {
  "/": "главная", "/games": "игры", "/upgrades": "прокачка", "/exchange": "обмен", "/leaderboard": "лидерборд",
};

// Общая рамка основных экранов: верхняя панель, (балансы), контент, нижнее меню, фон-картинка (если есть).
export default function Layout() {
  const { pathname } = useLocation();
  useАссеты();
  useFinalFreeze();
  const ключФона = ФОНЫ[pathname];
  return (
    <div className={`min-h-screen ${pathname === "/" ? "pb-20" : "pb-28"}`} style={pathname === "/" ? { backgroundColor: "#1B1515" } : ключФона ? стильФона(ключФона) : undefined}>
      {/* Лидерборд в верхней панели скрыт везде — на главной он свой (внутри автомата), на остальных не нужен */}
      <ВерхняяПанель скрытьЛидерборд={true} />
      {/* На главном экране свои крупные балансы */}
      {pathname !== "/" && <БалансыПилюли />}
      <Outlet />
      <BottomNav />
      <ДуэльнаяПлашка />
    </div>
  );
}

import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";

// Общая рамка: контент + нижняя навигация.
export default function Layout() {
  return (
    <div className="min-h-screen pb-24">
      <Outlet />
      <BottomNav />
    </div>
  );
}

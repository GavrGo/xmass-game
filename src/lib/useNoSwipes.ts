import { useEffect } from "react";
import { звук } from "./sound";

// Оболочка мини-игры:
//  • отключает вертикальные свайпы Telegram (иначе свайп вниз сворачивает приложение);
//  • переключает фоновую музыку на «игровую» и возвращает «главную» при выходе.
export function useNoSwipes() {
  useEffect(() => {
    const w = window.Telegram?.WebApp;
    try { w?.disableVerticalSwipes?.(); } catch {}
    звук.музыка("игра");
    return () => {
      try { w?.enableVerticalSwipes?.(); } catch {}
      звук.музыка("главная");
    };
  }, []);
}

import { useEffect } from "react";

// В Telegram свайп вниз может сворачивать игру. Пока открыта мини-игра, отключаем вертикальные свайпы.
export function useNoSwipes() {
  useEffect(() => {
    const w = window.Telegram?.WebApp;
    try { w?.disableVerticalSwipes?.(); } catch {}
    return () => { try { w?.enableVerticalSwipes?.(); } catch {} };
  }, []);
}

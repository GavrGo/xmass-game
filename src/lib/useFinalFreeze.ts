import { useEffect } from "react";
import { getFinalWinner } from "../api/users";
import { ФИНАЛ_МС } from "./final";

/** Как только настало время финала (или игрок зашёл в игру после него) — просим базу заморозить победителя. */
export function useFinalFreeze() {
  useEffect(() => {
    if (Number.isNaN(ФИНАЛ_МС)) return;
    const заморозить = () => { getFinalWinner(ФИНАЛ_МС).catch(() => {}); };
    const ждать = ФИНАЛ_МС - Date.now();
    if (ждать <= 0) { заморозить(); return; }
    if (ждать > 2 ** 31 - 1) return; // таймер браузера не умеет больше ~24 суток; сработает при следующем заходе
    const t = setTimeout(заморозить, ждать + 500);
    return () => clearTimeout(t);
  }, []);
}

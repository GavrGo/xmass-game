// Список эмодзи для круток аватара (берётся из config.ts) и счётчик купленных круток.
import { СТРОКА_ЭМОДЗИ, АВАТАР_КРУТКА } from "../config";

function разрезать(s: string): string[] {
  try {
    const seg = new (Intl as any).Segmenter("ru", { granularity: "grapheme" });
    return Array.from(seg.segment(s), (x: any) => x.segment as string);
  } catch {
    return Array.from(s);
  }
}

export const СПИСОК_ЭМОДЗИ: string[] = разрезать(СТРОКА_ЭМОДЗИ);

// Купленные крутки хранятся в памяти телефона (временный счётчик)
const ключ = (id: number | null) => `100hp_emoji_spins_${id}`;
export function прочитатьКрутки(id: number | null): number {
  try { return Math.max(0, Number(localStorage.getItem(ключ(id))) || 0); } catch { return 0; }
}
export function записатьКрутки(id: number | null, n: number) {
  try { localStorage.setItem(ключ(id), String(Math.max(0, n))); } catch {}
}

/** Анимация крутки: эмодзи мелькают (как барабаны слота) и останавливаются на итоговом. */
export function анимироватьЭмодзи(показать: (э: string) => void, итог: string): Promise<void> {
  return new Promise((готово) => {
    const таймер = setInterval(() => {
      показать(СПИСОК_ЭМОДЗИ[Math.floor(Math.random() * СПИСОК_ЭМОДЗИ.length)]);
    }, АВАТАР_КРУТКА.сменаКадраМс);
    setTimeout(() => {
      clearInterval(таймер);
      показать(итог);
      готово();
    }, АВАТАР_КРУТКА.длительностьМс);
  });
}

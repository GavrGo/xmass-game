// Подхват картинок из public/assets/: игра знает, какие файлы вы уже положили.
// Список файлов строит vite.config.ts автоматически (assets-manifest.json).
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { АССЕТЫ } from "../config";

let файлы: Set<string> | null = null;
let завершено = false;
let промис: Promise<void> | null = null;
const слушатели = new Set<() => void>();

export function загрузитьСписокФайлов(): Promise<void> {
  if (!промис) {
    промис = fetch("/assets-manifest.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((список) => { if (Array.isArray(список)) файлы = new Set<string>(список); })
      .catch(() => {})
      .then(() => { завершено = true; слушатели.forEach((f) => f()); });
  }
  return промис;
}

/** true / false — файл есть / нет. undefined — список файлов недоступен. */
export function естьФайл(путь: string): boolean | undefined {
  return файлы ? файлы.has(путь) : undefined;
}
export const списокЗагружен = () => завершено;

/** Подключите в компоненте, который показывает картинки: он обновится, когда список файлов загрузится. */
export function useАссеты() {
  const [, set] = useState(0);
  useEffect(() => {
    загрузитьСписокФайлов();
    const f = () => set((n) => n + 1);
    слушатели.add(f);
    return () => { слушатели.delete(f); };
  }, []);
}

/** Стиль фона экрана: картинка из public/assets/backgrounds/, если она есть. */
export function стильФона(ключ: keyof typeof АССЕТЫ.фоны): CSSProperties | undefined {
  const путь = АССЕТЫ.папки.фоны + АССЕТЫ.фоны[ключ];
  if (естьФайл(путь) !== true) return undefined;
  return { backgroundImage: `url(/${путь})`, backgroundSize: "cover", backgroundPosition: "center" };
}

const загруженные: HTMLImageElement[] = [];

export async function предзагрузитьUI(папка: string, onProgress: (доля: number) => void): Promise<void> {
  await загрузитьСписокФайлов();
  const пути = [...(файлы ?? [])].filter((п) => п.startsWith(папка) && /\.(png|jpe?g|webp|gif)$/i.test(п));
  if (!пути.length) { onProgress(1); return; }
  let готово = 0;
  await Promise.all(пути.map((п) => {
    const img = new Image();
    загруженные.push(img);
    img.src = `/${п}`;
    return img.decode().catch(() => {}).then(() => { готово++; onProgress(готово / пути.length); });
  }));
}

export function useПредзагрузкаUI(): { готово: boolean; доля: number } {
  const [доля, setДоля] = useState(0);
  const [готово, setГотово] = useState(false);
  useEffect(() => {
    let жив = true;
    предзагрузитьUI(АССЕТЫ.папки.ui, (д) => { if (жив) setДоля(д); }).then(() => { if (жив) setГотово(true); });
    return () => { жив = false; };
  }, []);
  return { готово, доля };
}

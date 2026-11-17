import { Иконка } from "./Icon";
import type { АССЕТЫ } from "../config";

const ЗНАКИ: Record<string, keyof typeof АССЕТЫ.иконки> = {
  "🪙": "фишки", "🎟️": "билеты", "🎟": "билеты", "❤️": "хэпэшки", "❤": "хэпэшки",
};

// Выводит строку, заменяя эмодзи валют (🪙 🎟️ ❤️) на картинки из assets/icons (slot-chip / slot-ticket / slot-heart).
export default function Эм({ children, размер = 16 }: { children: string; размер?: number }) {
  const части = String(children).split(/(🪙|🎟\uFE0F?|❤\uFE0F?)/);
  return (
    <>
      {части.map((ч, i) =>
        ЗНАКИ[ч] ? <Иконка key={i} имя={ЗНАКИ[ч]} размер={размер} className="mx-0.5 align-middle" /> : ч
      )}
    </>
  );
}

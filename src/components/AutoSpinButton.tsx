import { АССЕТЫ } from "../config";
import { Картинка } from "./Icon";
import { useАссеты } from "../lib/assets";

export default function КнопкаАвто({ e, вкл, onНажатие }: { e: number; вкл: boolean; onНажатие: () => void }) {
  useАссеты();
  const ПУТЬ = АССЕТЫ.папки.ui;
  const файл = вкл ? АССЕТЫ.ui.автоспинВкл : АССЕТЫ.ui.автоспинВыкл;
  return (
    <button
      onClick={onНажатие}
      aria-pressed={вкл}
      aria-label="Auto"
      className="relative block active:scale-95"
      style={{ width: 112 * e, height: 112 * e }}
    >
      <Картинка
        путь={ПУТЬ + файл}
        fallback={<span className="block h-full w-full rounded-full" style={{ background: вкл ? "#E8704A" : "#4A4550" }} />}
        className="h-full w-full"
      />
      <span
        className="pointer-events-none absolute inset-0 flex items-center justify-center font-extrabold text-white"
        style={{ fontSize: 26 * e, textShadow: "0 1px 3px rgba(0,0,0,.7)" }}
      >
        Auto
      </span>
    </button>
  );
}

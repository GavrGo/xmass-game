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
      aria-label="Autospin"
      className="block active:scale-95"
      style={{ width: 112 * e, height: 112 * e }}
    >
      <Картинка
        путь={ПУТЬ + файл}
        fallback={
          <span className="flex h-full w-full items-center justify-center rounded-full text-base font-bold text-white" style={{ background: вкл ? "#E8704A" : "#4A4550" }}>
            Auto
          </span>
        }
        className="h-full w-full"
      />
    </button>
  );
}

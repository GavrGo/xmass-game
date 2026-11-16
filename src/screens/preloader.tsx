import { Картинка } from "../components/Иконка";
import { АССЕТЫ } from "../config";
import { Т } from "../texts";
import { useАссеты } from "../lib/assets";

// Фон: public/assets/backgrounds/preloader.png (во весь экран)
// Персонаж: public/assets/characters/preloader.png
export default function Прелоадер() {
  useАссеты();
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-between overflow-hidden text-center"
      style={{
        backgroundImage: "url(/assets/backgrounds/preloader.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "#0F0F11",
      }}
    >
      <div className="mt-8 h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      <div className="flex flex-1 flex-col items-center justify-center">
        <Картинка
          путь={АССЕТЫ.папки.персонажи + АССЕТЫ.персонажи.прелоадер}
          fallback={<div className="text-[8rem] leading-none drop-shadow-2xl">🎄</div>}
          className="max-h-[40vh] object-contain drop-shadow-2xl"
        />
        <h1 className="mt-4 text-4xl font-extrabold tracking-wide text-white">{Т.прелоадер.название}</h1>
        <div className="mt-2 rounded-full bg-black/50 px-4 py-1 text-sm font-bold tracking-widest text-brand-yellow">{Т.прелоадер.слоган}</div>
      </div>
      <p className="mb-6 max-w-xs text-[11px] text-white/50">{Т.прелоадер.подвал}</p>
    </div>
  );
}

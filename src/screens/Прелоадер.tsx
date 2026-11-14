import { Картинка } from "../components/Иконка";
import { АССЕТЫ } from "../config";
import { Т } from "../texts";
import { стильФона, useАссеты } from "../lib/assets";

// Заставка при запуске (по макету «Preloader»).
// Картинки: public/assets/characters/preloader.png и public/assets/backgrounds/preloader.jpg
export default function Прелоадер() {
  useАссеты();
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-between overflow-hidden px-6 pb-6 pt-12 text-center"
      style={{ background: "radial-gradient(120% 90% at 50% 30%, #B3122D 0%, #4A0812 55%, #0F0F11 100%)", ...стильФона("прелоадер") }}
    >
      <div className="flex flex-1 flex-col items-center justify-center">
        <Картинка
          путь={АССЕТЫ.папки.персонажи + АССЕТЫ.персонажи.прелоадер}
          fallback={<div className="text-[9rem] leading-none drop-shadow-2xl">{Т.прелоадер.запасноеИзображение}</div>}
          className="max-h-[46vh] object-contain drop-shadow-2xl"
        />
        <div className="mt-5 h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        <h1 className="mt-4 text-4xl font-extrabold tracking-wide">{Т.прелоадер.название}</h1>
        <div className="mt-2 rounded-full bg-black/40 px-4 py-1 text-sm font-bold tracking-widest text-brand-yellow">{Т.прелоадер.слоган}</div>
      </div>
      <p className="max-w-xs text-[11px] text-white/50">{Т.прелоадер.подвал}</p>
    </div>
  );
}

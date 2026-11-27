import { Картинка } from "../components/Icon";
import { АССЕТЫ } from "../config";
import { Т } from "../texts";

// Фон: public/assets/backgrounds/preloader.png (во весь экран)
export default function Прелоадер({ доля }: { доля: number }) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center overflow-hidden text-center"
      style={{
        backgroundImage: "url(/assets/backgrounds/preloader.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "#4A0812",
      }}
    >
      {/* Крутилка сверху */}
      <div className="mt-10 h-8 w-8 animate-spin rounded-full border-2 border-white/40 border-t-white" />

      {/* Название и слоган */}
      <div className="mt-6 flex flex-col items-center">
        <h1 className="text-5xl font-black tracking-tight text-white drop-shadow-lg" style={{ lineHeight: 0.9 }}>
          CHRISTMAS<br />APP
        </h1>
        <div className="mt-3 text-sm font-bold tracking-[0.2em] text-white/90">{Т.прелоадер.слоган}</div>
      </div>

      {/* Пустое место под мешок на фоне */}
      <div className="flex-1" />

      <div className="mb-6 h-1.5 w-56 overflow-hidden rounded-full bg-white/20">
        <div className="h-full rounded-full bg-white transition-[width] duration-200" style={{ width: `${Math.round(доля * 100)}%` }} />
      </div>

      {/* Подвал */}
      <p className="mb-8 max-w-xs text-[11px] leading-relaxed text-white/60">{Т.прелоадер.подвал}</p>
    </div>
  );
}

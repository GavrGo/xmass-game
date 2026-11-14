import type { ReactNode } from "react";
import { Т } from "../texts";

// Красная модалка из макетов. Используется во всех окнах результатов и онбординге.
//  режим "fixed"    — поверх всего экрана (главный экран, обмен);
//  режим "absolute" — внутри полноэкранной мини-игры;
//  снизу            — «шторка» снизу (онбординг);
//  hero             — картинка, «парящая» над верхней кромкой окна;
//  onClose          — показывает крестик закрытия.
export default function Модалка({
  children, onClose, hero, снизу = false, режим = "fixed",
}: { children: ReactNode; onClose?: () => void; hero?: ReactNode; снизу?: boolean; режим?: "fixed" | "absolute" }) {
  return (
    <div
      className={`${режим === "fixed" ? "fixed z-40" : "absolute z-10"} inset-0 flex justify-center overflow-y-auto bg-black/70 p-4 ${
        снизу ? "items-end" : "items-center"
      }`}
    >
      <div className={`modal-card relative w-full max-w-sm p-5 text-center ${hero ? "mt-12 pt-14" : ""}`}>
        {hero && <div className="absolute -top-12 left-1/2 flex -translate-x-1/2 justify-center">{hero}</div>}
        {onClose && (
          <button onClick={onClose} aria-label={Т.общее.закрыть} className="absolute right-3 top-3 h-7 w-7 rounded-full bg-black/30 text-sm text-white/80">
            {Т.общее.крестик}
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

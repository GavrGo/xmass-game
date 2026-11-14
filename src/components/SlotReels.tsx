import { СИМВОЛЫ_СЛОТА } from "../config";
import { Картинка } from "./Иконка";

// Три барабана. Только картинка — логика в Home.tsx.
// Картинки символов: public/assets/icons/slot-<id>.png (heart, chip, ticket, bomb, gift). Нет файла — эмодзи.
export default function SlotReels({ символы, крутятся }: { символы: string[]; крутятся: boolean[] }) {
  return (
    <div className="flex justify-center gap-3 rounded-[20px] border border-[#2B2C35] bg-[#181920] p-4">
      {символы.map((эм, i) => {
        const id = СИМВОЛЫ_СЛОТА.find((с) => с.эмодзи === эм)?.id;
        return (
          <div
            key={i}
            className={`flex aspect-square w-[28%] max-w-[110px] items-center justify-center rounded-2xl bg-[#0F0F13] text-5xl shadow-inner ring-1 ring-white/5 transition ${
              крутятся[i] ? "scale-95 animate-pulse blur-[1px]" : ""
            }`}
          >
            {id ? (
              <Картинка путь={`assets/icons/slot-${id}.png`} fallback={<span>{эм}</span>} className="h-[78%] w-[78%] object-contain" />
            ) : (
              <span>{эм}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

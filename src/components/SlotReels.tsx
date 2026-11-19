import { АВТОМАТ, ВСЕ_СИМВОЛЫ_СЛОТА, путьКартинкиСимвола } from "../config";
import { Картинка } from "./Icon";

// Три барабана внутри экрана автомата. Каждый барабан показывает 3 символа: сверху и снизу — тусклые «соседи».
// Картинки символов: public/assets/icons/slot-<id>.png (heart, chip, ticket, bomb, gift). Нет файла — эмодзи.
// e — масштаб: сколько пикселей экрана в одной единице рисунка.
export default function SlotReels({
  символы, соседи, крутятся, e,
}: { символы: string[]; соседи: [string, string][]; крутятся: boolean[]; e: number }) {
  const { экран, символ, шагСимволов, яркостьСоседей } = АВТОМАТ;
  const колонка = экран.w / 3;

  const ячейка = (id: string, центрY: number, тусклый: boolean) => {
    const эм = ВСЕ_СИМВОЛЫ_СЛОТА.find((с) => с.id === id)?.эмодзи ?? "";
    return (
      <div
        style={{
          position: "absolute", left: (колонка - символ) / 2 * e, top: (центрY - символ / 2) * e, width: символ * e, height: символ * e,
          opacity: тусклый ? яркостьСоседей : 1,
          filter: тусклый ? "brightness(0.8)" : undefined,
        }}
        className="flex items-center justify-center"
      >
        {id ? (
          <Картинка путь={путьКартинкиСимвола(id)} fallback={<span style={{ fontSize: символ * 0.7 * e }}>{эм}</span>} className="h-full w-full object-contain" />
        ) : (
          <span style={{ fontSize: символ * 0.7 * e }}>{эм}</span>
        )}
      </div>
    );
  };

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex" }}>
      {символы.map((id, i) => (
        <div key={i} className={крутятся[i] ? "reel-shake" : ""} style={{ position: "relative", width: колонка * e, height: экран.h * e }}>
          {ячейка(соседи[i][0], экран.h / 2 - шагСимволов, true)}
          {ячейка(id, экран.h / 2, false)}
          {ячейка(соседи[i][1], экран.h / 2 + шагСимволов, true)}
        </div>
      ))}
    </div>
  );
}

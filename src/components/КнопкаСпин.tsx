import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { АВТОМАТ, АССЕТЫ, СЛОТ } from "../config";
import { Картинка } from "./Иконка";
import { естьФайл, useАссеты } from "../lib/assets";
import { звук } from "../lib/sound";

// Кнопка Spin из трёх частей (по макету):
//   1) задняя металлическая рамка (стоит на месте),
//   2) красная часть (двигается: резко вжимается вниз и плавно возвращается),
//   3) передняя металлическая рамка (стоит на месте, поверх красной — красная «заезжает» под неё).
// e — масштаб: сколько пикселей экрана в одной единице рисунка.
export default function КнопкаСпин({
  e, подпись, приглушена, onНажатие,
}: { e: number; подпись: ReactNode; приглушена: boolean; onНажатие: () => void }) {
  useАссеты();
  const К = АВТОМАТ.кнопка;
  const есть_выкл = естьФайл(АССЕТЫ.папки.ui + АССЕТЫ.ui.кнопкаКраснаяВыкл) === true; // есть ли картинка погасшей кнопки
  const ПУТЬ = АССЕТЫ.папки.ui;
  const [нажата, setНажата] = useState(false);
  const началоНажатия = useRef(0);
  const таймер = useRef<ReturnType<typeof setTimeout>>();

  const вжать = () => {
    clearTimeout(таймер.current);
    началоНажатия.current = performance.now();
    setНажата(true);
  };
  // Отпускаем не раньше минимального времени «в нажатом состоянии» — иначе при быстром тапе анимации не видно
  const отпустить = () => {
    const осталось = Math.max(0, СЛОТ.кнопка.минУдержаниеМс - (performance.now() - началоНажатия.current));
    clearTimeout(таймер.current);
    таймер.current = setTimeout(() => setНажата(false), осталось);
  };

  const место = (р: { x: number; y: number; w: number; h: number }) => ({
    position: "absolute" as const, left: р.x * e, top: р.y * e, width: р.w * e, height: р.h * e,
  });

  return (
    <button
      type="button"
      onPointerDown={вжать}
      onPointerUp={отпустить}
      onPointerLeave={отпустить}
      onPointerCancel={отпустить}
      onClick={() => { звук.sfx("клик"); onНажатие(); }}
      className="select-none outline-none"
      style={{ position: "relative", display: "block", width: К.w * e, height: К.h * e, touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
    >
      {/* 1. Задняя рамка */}
      <div style={{ ...место(К.основание), zIndex: 1 }}>
        <Картинка путь={ПУТЬ + АССЕТЫ.ui.кнопкаОснование} fallback={<div className="h-full w-full rounded-3xl bg-slate-600" />} className="h-full w-full" />
      </div>

      {/* 2. Красная часть: двигается вниз под переднюю рамку */}
      <div
        style={{
          ...место(К.красная),
          zIndex: 2,
          transform: нажата ? `translateY(${СЛОТ.кнопка.глубинаНажатия * e}px)` : "translateY(0)",
          // вниз — резкий разгон (ease-in), вверх — быстрый старт и плавное замедление (ease-out)
          transition: нажата
            ? `transform ${СЛОТ.кнопка.нажатиеМс}ms cubic-bezier(0.5, 0, 1, 0.6)`
            : `transform ${СЛОТ.кнопка.отпусканиеМс}ms cubic-bezier(0.1, 0.9, 0.2, 1)`,
          transitionProperty: "transform, filter",
          filter: приглушена && !есть_выкл ? `saturate(${СЛОТ.кнопка.насыщенностьБезБилетов})` : undefined,
          willChange: "transform",
        }}
      >
        <Картинка путь={ПУТЬ + АССЕТЫ.ui.кнопкаКрасная} fallback={<div className="h-full w-full rounded-3xl bg-red-600" />} className="h-full w-full" />
        {/* Погасшая красная часть: плавно проявляется поверх обычной (через opacity), когда крутить нельзя */}
        {есть_выкл && (
          <div className="absolute inset-0" style={{ opacity: приглушена ? 1 : 0, transition: `opacity ${СЛОТ.кнопка.затуханиеМс}ms ease` }}>
            <Картинка путь={ПУТЬ + АССЕТЫ.ui.кнопкаКраснаяВыкл} fallback={null} className="h-full w-full" />
          </div>
        )}
        <div
          className="absolute inset-x-0 flex items-center justify-center gap-1 whitespace-nowrap font-bold text-white"
          style={{ top: 10 * e, height: 110 * e, fontSize: 34 * e, textShadow: "0 1px 2px rgba(120,20,0,0.5)" }}
        >
          {подпись}
        </div>
      </div>

      {/* 3. Передняя рамка */}
      <div style={{ ...место(К.рамка), zIndex: 3, pointerEvents: "none" }}>
        <Картинка путь={ПУТЬ + АССЕТЫ.ui.кнопкаРамка} fallback={null} className="h-full w-full" />
      </div>
    </button>
  );
}

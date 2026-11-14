import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { АССЕТЫ } from "../config";
import { Т } from "../texts";
import { естьФайл, списокЗагружен, useАссеты } from "../lib/assets";

/**
 * Картинка из public/ (путь вида "assets/icons/chip.png"). Если файла нет — показывается fallback
 * (эмодзи или заглушка). Положили файл в папку — после обновления страницы он появится сам.
 */
export function Картинка({
  путь, fallback, className, style, alt = "",
}: { путь: string; fallback: ReactNode; className?: string; style?: CSSProperties; alt?: string }) {
  useАссеты();
  const [битая, setБитая] = useState(false);
  const есть = естьФайл(путь);
  if (битая || есть === false) return <>{fallback}</>;
  if (есть === undefined && !списокЗагружен()) return <>{fallback}</>; // ждём список файлов
  return <img src={"/" + путь} alt={alt} className={className} style={style} draggable={false} onError={() => setБитая(true)} />;
}

/** Значок (валюта, меню, кнопки): картинка из assets/icons/ или эмодзи из texts.ts. */
export function Иконка({
  имя, размер = 20, className = "",
}: { имя: keyof typeof АССЕТЫ.иконки; размер?: number; className?: string }) {
  const эмодзи = Т.иконки[имя] ?? "";
  return (
    <Картинка
      путь={АССЕТЫ.папки.иконки + АССЕТЫ.иконки[имя]}
      fallback={<span className={`inline-block text-center ${className}`} style={{ fontSize: размер * 0.85, lineHeight: 1, width: размер }}>{эмодзи}</span>}
      className={`inline-block object-contain ${className}`}
      style={{ width: размер, height: размер }}
    />
  );
}

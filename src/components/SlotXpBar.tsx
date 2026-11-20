import { useState } from "react";
import { createPortal } from "react-dom";
import Modal from "./Modal";
import { СЛОТ, ОПЫТ_СЛОТА } from "../config";
import { уровеньОпытаСлота } from "../game/slotXp";

export default function SlotXpBar({ спинов }: { спинов: number }) {
  const [открыт, setОткрыт] = useState(false);
  const у = уровеньОпытаСлота(спинов);

  return (
    <>
      <button
        onClick={() => setОткрыт(true)}
        aria-label="Опыт слота"
        className="relative flex h-full w-full items-center overflow-hidden rounded-full bg-black/50 ring-1 ring-white/15 active:scale-[0.98]"
      >
        <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-[width] duration-500" style={{ width: `${у.прогресс * 100}%` }} />
        <span className="absolute inset-0 flex items-center justify-center text-xs font-extrabold text-white drop-shadow">{у.уровень}</span>
      </button>
      {открыт && createPortal(
        <Modal onClose={() => setОткрыт(false)}>
          <h3 className="mb-1 text-lg font-bold">Опыт слота</h3>
          <p className="mb-3 text-xs text-muted">Каждый спин даёт опыт. Чем выше уровень, тем больше сердец за тройку и подарок.</p>
          <div className="mb-3 text-sm font-semibold">
            Уровень {у.уровень} · {спинов} спинов
            {у.следующийПорог !== null ? ` · до ${у.уровень + 1} ур. ещё ${у.следующийПорог - спинов}` : " · максимум"}
          </div>
          <ul className="space-y-1 text-left text-xs">
            {ОПЫТ_СЛОТА.спинов.map((порог, i) => (
              <li key={i} className={`flex justify-between rounded-lg px-2 py-1 ${i + 1 === у.уровень ? "bg-white/15 font-bold" : "text-muted"}`}>
                <span>Ур. {i + 1} · от {порог} спинов</span>
                <span>×{ОПЫТ_СЛОТА.множители[i]} · ❤️ {Math.round(СЛОТ.хэпэшекЗаТриСердца * ОПЫТ_СЛОТА.множители[i])}</span>
              </li>
            ))}
          </ul>
        </Modal>,
        document.body,
      )}
    </>
  );
}

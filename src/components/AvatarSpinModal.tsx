import { useState } from "react";
import { СПИСОК_ЭМОДЗИ } from "../game/emoji";

interface Props {
  текущий: string;                          // аватар игрока сейчас
  осталось: number;                         // сколько круток осталось
  onКрутка: () => void;                     // вызывается при каждой крутке (уменьшить счётчик)
  onВыбрать: (эмодзи: string) => Promise<void>; // сохранить выбранный аватар
  onЗакрыть: () => void;
}

// Окно круток эмодзи для новой аватарки
export default function AvatarSpinModal({ текущий, осталось, onКрутка, onВыбрать, onЗакрыть }: Props) {
  const [превью, setПревью] = useState(текущий);
  const [крутили, setКрутили] = useState(false);
  const [сохраняю, setСохраняю] = useState(false);
  const [ошибка, setОшибка] = useState("");

  const крутить = () => {
    if (осталось <= 0) return;
    setПревью(СПИСОК_ЭМОДЗИ[Math.floor(Math.random() * СПИСОК_ЭМОДЗИ.length)]);
    setКрутили(true);
    onКрутка();
  };

  const выбрать = async () => {
    setСохраняю(true);
    try {
      await onВыбрать(превью);
      onЗакрыть();
    } catch (e: any) {
      setОшибка(e.message ?? "Не удалось сохранить");
      setСохраняю(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-5">
      <div className="w-full max-w-sm rounded-3xl bg-xmas-dark p-5 text-center ring-2 ring-xmas-gold">
        <h3 className="mb-3 text-xl font-bold">Новая аватарка</h3>
        <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-full bg-white/10 text-8xl">{превью}</div>
        <p className="mt-3 text-sm text-white/70">Осталось круток: <b>{осталось}</b></p>
        {крутили && <p className="mt-1 text-xs text-white/40">Не нажмёте «Оставить» — аватар не изменится</p>}

        <button
          onClick={крутить}
          disabled={осталось <= 0 || сохраняю}
          className="mt-4 w-full rounded-xl bg-xmas-red py-3 text-lg font-bold disabled:bg-gray-600 disabled:text-white/40"
        >
          Крутить
        </button>
        <button
          onClick={выбрать}
          disabled={!крутили || превью === текущий || сохраняю}
          className="mt-2 w-full rounded-xl bg-xmas-green py-3 text-lg font-bold disabled:bg-gray-600 disabled:text-white/40"
        >
          {сохраняю ? "Сохраняем…" : "Оставить этот"}
        </button>
        <button onClick={onЗакрыть} disabled={сохраняю} className="mt-2 w-full rounded-xl bg-white/10 py-2 text-sm">
          Закрыть
        </button>
        {ошибка && <p className="mt-2 text-sm text-red-400">{ошибка}</p>}
      </div>
    </div>
  );
}

import { useState } from "react";
import { СПИСОК_ЭМОДЗИ, анимироватьЭмодзи } from "../game/emoji";
import Модалка from "./Модалка";
import { Т } from "../texts";

interface Props {
  текущий: string;                          // аватар игрока сейчас
  осталось: number;                         // сколько круток осталось
  onКрутка: () => void;                     // вызывается при каждой крутке (уменьшить счётчик)
  onВыбрать: (эмодзи: string) => Promise<void>; // сохранить выбранный аватар
  onЗакрыть: () => void;
}

// Окно круток эмодзи для новой аватарки
export default function AvatarSpinModal({ текущий, осталось, onКрутка, onВыбрать, onЗакрыть }: Props) {
  const ТА = Т.обмен.аватар;
  const [превью, setПревью] = useState(текущий);
  const [крутили, setКрутили] = useState(false);
  const [крутится, setКрутится] = useState(false);
  const [сохраняю, setСохраняю] = useState(false);
  const [ошибка, setОшибка] = useState("");

  const крутить = async () => {
    if (осталось <= 0 || крутится) return;
    const итогЭмодзи = СПИСОК_ЭМОДЗИ[Math.floor(Math.random() * СПИСОК_ЭМОДЗИ.length)];
    setКрутили(true);
    setКрутится(true);
    onКрутка();
    await анимироватьЭмодзи(setПревью, итогЭмодзи); // эмодзи мелькают, потом останавливаются
    setКрутится(false);
  };

  const выбрать = async () => {
    setСохраняю(true);
    try {
      await onВыбрать(превью);
      onЗакрыть();
    } catch (e: any) {
      setОшибка(e.message ?? ТА.ошибкаСохранения);
      setСохраняю(false);
    }
  };

  return (
    <Модалка>
      <h3 className="mb-3 text-xl font-bold">{ТА.заголовок}</h3>
      <div className={`mx-auto flex h-36 w-36 items-center justify-center rounded-full bg-black/35 text-8xl ring-4 ring-white/10 transition ${крутится ? "scale-95 animate-pulse blur-[1px]" : ""}`}>{превью}</div>
      <p className="mt-3 text-sm text-white/80">{ТА.осталось(осталось)}</p>
      {крутили && <p className="mt-1 text-xs text-white/50">{ТА.предупреждение}</p>}

      <button onClick={крутить} disabled={осталось <= 0 || крутится || сохраняю} className="btn btn-yellow mt-4 w-full !py-3 text-lg">{ТА.крутить}</button>
      <button onClick={выбрать} disabled={!крутили || крутится || превью === текущий || сохраняю} className="btn btn-blue mt-2 w-full !py-3 text-lg">
        {сохраняю ? ТА.сохраняем : ТА.оставить}
      </button>
      <button onClick={onЗакрыть} disabled={сохраняю || крутится} className="btn btn-ghost mt-2 w-full !py-2 text-sm">{ТА.закрыть}</button>
      {ошибка && <p className="mt-2 text-sm text-red-300">{ошибка}</p>}
    </Модалка>
  );
}

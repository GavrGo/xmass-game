import { Т } from "../texts";

export interface ЗаписьРекорда { nickname: string; значение: number }

// Единый блок рекордов в окнах результата всех мини-игр:
//   Личный рекорд: 35
//   Глобальный рекорд: 48
//       рекорд за Andrey
export default function РекордыБлок({
  личный,
  глобальный,
}: {
  личный: ЗаписьРекорда;
  глобальный: ЗаписьРекорда | null | "ошибка" | undefined; // undefined — ещё грузим
}) {
  const есть = глобальный && глобальный !== "ошибка";
  return (
    <div className="stat-box mb-3 p-3 text-left text-sm">
      <div>{Т.рекорды.личный}: <b>{личный.значение}</b></div>
      <div className="mt-2">
        {Т.рекорды.глобальный}: <b>{глобальный === undefined ? "…" : есть ? глобальный.значение : Т.рекорды.прочерк}</b>
      </div>
      {есть && <div className="mt-0.5 pl-4 text-xs text-white/60">{Т.рекорды.рекордЗа} {глобальный.nickname}</div>}
    </div>
  );
}

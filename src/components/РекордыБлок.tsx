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
    <div className="mb-3 rounded-2xl bg-white/10 p-3 text-left text-sm">
      <div>Личный рекорд: <b>{личный.значение}</b></div>
      <div className="mt-2">
        Глобальный рекорд: <b>{глобальный === undefined ? "…" : есть ? глобальный.значение : "—"}</b>
      </div>
      {есть && <div className="mt-0.5 pl-4 text-xs text-white/60">рекорд за {глобальный.nickname}</div>}
    </div>
  );
}

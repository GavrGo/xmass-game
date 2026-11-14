export interface ЗаписьРекорда { nickname: string; значение: number }

// Общий блок рекордов для окон результата мини-игр: «Рекорд за Andrey 35»
export default function РекордыБлок({
  личный,
  глобальный,
}: {
  личный: ЗаписьРекорда;
  глобальный: ЗаписьРекорда | null | "ошибка" | undefined; // undefined — ещё грузим
}) {
  return (
    <div className="mb-3 rounded-2xl bg-white/10 p-3 text-left text-sm">
      <div className="text-xs text-white/50">Личный рекорд</div>
      <div className="mb-2 font-bold">🏅 Рекорд за {личный.nickname} {личный.значение}</div>
      <div className="text-xs text-white/50">Глобальный рекорд</div>
      <div className="font-bold">
        {глобальный === undefined
          ? "…"
          : !глобальный || глобальный === "ошибка"
          ? "—"
          : `🌍 Рекорд за ${глобальный.nickname} ${глобальный.значение}`}
      </div>
    </div>
  );
}

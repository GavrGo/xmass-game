// Строка в таблице итогов (слева подпись, справа значение) и разделитель.
export default function СтрокаИтога({ л, п }: { л: string; п: string }) {
  return (
    <div className="flex justify-between gap-3 py-0.5">
      <span className="text-white/60">{л}</span>
      <span className="text-right font-bold">{п}</span>
    </div>
  );
}
export const Разделитель = () => <div className="my-1 border-t border-white/10" />;

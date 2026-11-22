import type { КолонкаРекорда } from "../api/users";
import type { Мастерство } from "../lib/useMastery";
import { useGlobalRecord } from "../lib/useGlobalRecord";
import { Иконка } from "./Icon";
import { Т } from "../texts";

export interface Сложность { id: string; название: string; подпись?: string; множитель?: number }

interface Props {
  колонка: КолонкаРекорда;
  форматРекорда?: (n: number) => string;
  мастерство: Мастерство;
  сложности?: Сложность[];
  заголовокВыбора?: string;
  выбрана?: string;
  onВыбор?: (id: string) => void;
  готово?: boolean;
  onСтарт: () => void;
  onНазад: () => void;
}

export default function GameMenu({
  колонка, форматРекорда, мастерство, сложности, заголовокВыбора = "Сложность", выбрана, onВыбор, готово = true, onСтарт, onНазад,
}: Props) {
  const рекорд = useGlobalRecord(колонка);
  const формат = форматРекорда ?? ((n: number) => n.toLocaleString("ru-RU"));

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center overflow-y-auto bg-black/80 px-5 pb-6 pt-4">
      <div className="flex w-full max-w-sm items-center">
        <button onClick={onНазад} className="btn btn-ghost !px-3 !py-2 text-sm">{Т.общее.назад}</button>
      </div>

      <div className="mt-6 grid w-full max-w-sm gap-3">
        <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-white/50">Мастерство</div>
              <div className="text-xl font-extrabold text-white">Уровень {мастерство.уровень}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wider text-white/50">Бонус</div>
              <div className="text-lg font-extrabold text-amber-300">+{мастерство.процент}%</div>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/50">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-[width] duration-500" style={{ width: `${Math.round(мастерство.прогресс * 100)}%` }} />
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
          <Иконка имя="лидерборд" размер={36} />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-wider text-white/50">Глобальный рекорд</div>
            {рекорд === undefined ? (
              <div className="text-sm text-white/40">…</div>
            ) : рекорд ? (
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-sm text-white/70">{рекорд.nickname}</span>
                <span className="shrink-0 text-xl font-extrabold text-brand-yellow">{формат(рекорд.значение)}</span>
              </div>
            ) : (
              <div className="text-sm text-white/60">Пока никто</div>
            )}
          </div>
        </div>
      </div>

      {сложности && (
        <div className="mt-6 w-full max-w-sm">
          <div className="mb-2 text-[11px] uppercase tracking-wider text-white/50">{заголовокВыбора}</div>
          <div className="grid gap-2">
            {сложности.map((с) => (
              <button
                key={с.id}
                onClick={() => onВыбор?.(с.id)}
                className={`opt flex items-center justify-between p-3 text-left ${выбрана === с.id ? "opt-on" : ""}`}
              >
                <span className="min-w-0">
                  <span className="block font-bold text-white">{с.название}</span>
                  {с.подпись && <span className="block text-xs text-white/60">{с.подпись}</span>}
                </span>
                {с.множитель !== undefined && (
                  <span className="shrink-0 rounded-lg bg-amber-400/15 px-2 py-1 text-sm font-extrabold text-amber-300">×{с.множитель}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <button onClick={onСтарт} disabled={!готово} className="btn btn-yellow mt-6 w-full max-w-sm !py-4 text-xl">
        {готово ? Т.общее.старт : Т.общее.загрузка}
      </button>
    </div>
  );
}

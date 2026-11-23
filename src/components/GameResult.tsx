import type { КолонкаРекорда } from "../api/users";
import type { Мастерство, Срез } from "../lib/useMastery";
import { подсказкаТребования } from "../game/mastery";
import { useEffect, useState } from "react";
import { useGlobalRecord } from "../lib/useGlobalRecord";
import { Иконка } from "./Icon";
import Модалка from "./Modal";

interface Кнопка { подпись: string; onClick: () => void; disabled?: boolean }

interface Props {
  заголовок: string;
  база: number;
  прокачкаПроц: number;
  мастерство: Мастерство;
  итог: number;
  прогресс: { подпись: string; значение: string };
  лучший: number;
  лучшийПодпись: string;
  колонка: КолонкаРекорда;
  форматРекорда?: (n: number) => string;
  основная: Кнопка;
  вторичная?: Кнопка;
  предупреждение?: string;
  ошибка?: string;
  шкала?: () => Срез;
}

function Строка({ подпись, значение }: { подпись: string; значение: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-white/60">{подпись}</span>
      <span className="font-bold text-white">{значение}</span>
    </div>
  );
}

function Плитка({ подпись, значение, под }: { подпись: string; значение: string; под?: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center rounded-xl bg-white/5 px-2 py-2.5 ring-1 ring-white/10">
      <span className="text-[10px] uppercase tracking-wider text-white/50">{подпись}</span>
      <span className="mt-0.5 text-base font-extrabold text-white">{значение}</span>
      {под && <span className="max-w-full truncate text-[10px] text-white/50">{под}</span>}
    </div>
  );
}

function ШкалаМастерства({ срез }: { срез: Срез }) {
  const [xp, setXp] = useState(срез.от);
  useEffect(() => {
    const начало = performance.now();
    let кадр = 0;
    const шаг = (now: number) => {
      const k = Math.min(1, (now - начало) / 1400);
      setXp(срез.от + (срез.до - срез.от) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) кадр = requestAnimationFrame(шаг);
    };
    кадр = requestAnimationFrame(шаг);
    return () => cancelAnimationFrame(кадр);
  }, [срез]);
  const старт = срез.перевести(срез.от);
  const вид = срез.перевести(xp);
  const поднялся = вид.уровень > старт.уровень;
  const база = поднялся ? 1 : старт.прогресс;
  const заезд = поднялся
    ? { слева: 0, ширина: вид.прогресс }
    : { слева: база, ширина: Math.max(0, вид.прогресс - база) };
  return (
    <div className="mt-4 rounded-2xl bg-white/5 px-4 py-3 text-left ring-1 ring-white/10">
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <span className="font-bold">Мастерство · Ур. {вид.уровень}</span>
      </div>
      <div className="relative h-3 overflow-hidden rounded-full bg-black/50 ring-1 ring-white/10">
        <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-sky-600 to-sky-400" style={{ width: `${база * 100}%` }} />
        <div
          className="absolute inset-y-0 bg-gradient-to-r from-sky-200 to-cyan-100 shadow-[0_0_8px_rgba(186,230,253,0.7)]"
          style={{ left: `${заезд.слева * 100}%`, width: `${заезд.ширина * 100}%` }}
        />
      </div>
      <div className="mt-1.5 flex gap-3 text-[10px] text-white/50">
        <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-sky-500" />до забега</span>
        <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-cyan-100" />за забег</span>
      </div>
      {вид.заблокирован && <p className="mt-1.5 text-[11px] text-orange-300">{подсказкаТребования(вид.следующее)}</p>}
    </div>
  );
}

export default function GameResult({
  заголовок, база, прокачкаПроц, мастерство, итог, прогресс, лучший, лучшийПодпись,
  колонка, форматРекорда, основная, вторичная, предупреждение, ошибка, шкала,
}: Props) {
  const рекорд = useGlobalRecord(колонка);
  const формат = форматРекорда ?? ((n: number) => n.toLocaleString("ru-RU"));
  const [срез] = useState(() => шкала?.());
  const бонусы = [
    прокачкаПроц > 0 && { подпись: "Прокачка ЗП", значение: `+${прокачкаПроц}%` },
    мастерство.процент > 0 && { подпись: `Мастерство · ур. ${мастерство.уровень}`, значение: `+${мастерство.процент}%` },
    мастерство.рекордПроц > 0 && { подпись: "Рекорд", значение: `+${мастерство.рекордПроц}%` },
  ].filter(Boolean) as { подпись: string; значение: string }[];

  return (
    <Модалка режим="absolute">
      <div className="text-xs font-bold uppercase tracking-widest text-white/50">{заголовок}</div>

      <div className="mt-3 rounded-2xl bg-white/5 px-4 py-2 text-left ring-1 ring-white/10">
        <Строка подпись="За забег" значение={база.toLocaleString("ru-RU")} />
        {бонусы.map((б) => <Строка key={б.подпись} подпись={б.подпись} значение={б.значение} />)}
      </div>

      {срез && <ШкалаМастерства срез={срез} />}

      <div className="mt-4 flex flex-col items-center">
        <span className="text-[11px] uppercase tracking-wider text-white/50">Итого фишек</span>
        <div className="mt-1 flex items-center justify-center gap-2">
          <Иконка имя="фишки" размер={38} />
          <span className="text-5xl font-extrabold leading-none tabular-nums text-brand-yellow">{итог.toLocaleString("ru-RU")}</span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <Плитка подпись={прогресс.подпись} значение={прогресс.значение} />
        <Плитка подпись={лучшийПодпись} значение={формат(лучший)} />
        <Плитка подпись="Рекорд" значение={рекорд ? формат(рекорд.значение) : "—"} под={рекорд?.nickname} />
      </div>

      {ошибка && <p className="mt-3 text-xs text-red-300">{ошибка}</p>}
      {предупреждение && <p className="mt-3 text-xs text-orange-300">{предупреждение}</p>}

      <div className="mt-5 flex gap-2">
        {вторичная && (
          <button onClick={вторичная.onClick} disabled={вторичная.disabled} className="btn btn-secondary flex-1 !py-3">{вторичная.подпись}</button>
        )}
        <button onClick={основная.onClick} disabled={основная.disabled} className="btn btn-primary flex-1 !py-3">{основная.подпись}</button>
      </div>
    </Модалка>
  );
}

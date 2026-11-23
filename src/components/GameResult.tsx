import type { КолонкаРекорда } from "../api/users";
import type { Мастерство, Срез } from "../lib/useMastery";
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
  const вид = срез.перевести(xp);
  return (
    <div className="mt-4 rounded-2xl bg-white/5 px-4 py-3 text-left ring-1 ring-white/10">
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <span className="font-bold">Мастерство · Ур. {вид.уровень}</span>
        <span className="font-bold text-cyan-300">+{вид.процент}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-black/50 ring-1 ring-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-300" style={{ width: `${вид.прогресс * 100}%` }} />
      </div>
      {вид.заблокирован && вид.нужно && (
        <p className="mt-1.5 text-[11px] text-orange-300">Открывается, когда другие игры будут на ур. {вид.нужно.наУровне}+ (нужно {вид.нужно.игр})</p>
      )}
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

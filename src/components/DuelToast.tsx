import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDuelNotices } from "../lib/useDuelNotices";
import type { ВидПлашки } from "../lib/useDuelNotices";
import { getSafeTop } from "../lib/telegram";
import { Т } from "../texts";

const СТИЛЬ: Record<ВидПлашки, { эмодзи: string; фон: string; рамка: string; свет: string }> = {
  вызвали:   { эмодзи: "🥊", фон: "linear-gradient(135deg,#5a3a06,#2a1a04)", рамка: "rgba(255,196,60,.8)", свет: "rgba(255,180,40,.45)" },
  победа:    { эмодзи: "🎉", фон: "linear-gradient(135deg,#1f4d12,#0e2608)", рамка: "rgba(170,235,60,.8)", свет: "rgba(150,230,40,.4)" },
  поражение: { эмодзи: "😭", фон: "linear-gradient(135deg,#5a1410,#2a0807)", рамка: "rgba(255,110,90,.75)", свет: "rgba(240,60,40,.4)" },
  ничья:     { эмодзи: "🤝", фон: "linear-gradient(135deg,#34363d,#18191d)", рамка: "rgba(255,255,255,.4)", свет: "rgba(255,255,255,.18)" },
  отказ:     { эмодзи: "🙅", фон: "linear-gradient(135deg,#34363d,#18191d)", рамка: "rgba(255,255,255,.4)", свет: "rgba(255,255,255,.18)" },
  истёк:     { эмодзи: "⌛", фон: "linear-gradient(135deg,#34363d,#18191d)", рамка: "rgba(255,255,255,.4)", свет: "rgba(255,255,255,.18)" },
};
const ПОКАЗ_МС = 6500;

/** Плашка сверху экрана о дуэлях. Нажатие закрывает; на входящем вызове ещё и ведёт на лидерборд. */
export default function ДуэльнаяПлашка() {
  const { текущая, осталосьЕщё, закрыть } = useDuelNotices();
  const navigate = useNavigate();

  useEffect(() => {
    if (!текущая) return;
    const t = setTimeout(закрыть, ПОКАЗ_МС);
    return () => clearTimeout(t);
  }, [текущая?.ключ, закрыть]);

  if (!текущая) return null;
  const с = СТИЛЬ[текущая.вид];
  const нажали = () => { закрыть(); if (текущая.вид === "вызвали") navigate("/leaderboard"); };

  return (
    <div className="pointer-events-none fixed inset-x-0 z-[90] flex justify-center px-3" style={{ top: getSafeTop() + 8 }}>
      <button
        key={текущая.ключ}
        onClick={нажали}
        aria-label={Т.уведомленияДуэлей.скрыть}
        className="duel-toast pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl px-4 py-3 text-left text-white"
        style={{ background: с.фон, border: `1px solid ${с.рамка}`, boxShadow: `0 8px 28px rgba(0,0,0,.55), 0 0 22px ${с.свет}` }}
      >
        <span className="text-3xl leading-none">{с.эмодзи}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-extrabold leading-tight">{текущая.заголовок}</span>
          <span className="mt-0.5 block text-xs leading-snug text-white/80">{текущая.текст}</span>
        </span>
        {осталосьЕщё > 0 && <span className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-bold">+{осталосьЕщё}</span>}
      </button>
    </div>
  );
}

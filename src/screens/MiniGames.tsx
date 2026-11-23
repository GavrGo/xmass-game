import { useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import Modal from "../components/Modal";
import { useUser } from "../store/UserContext";
import { КСЮХА_РАН, ПЯТНАШКИ, ТРИ_В_РЯД, ДЖИРА_ФАЙТ, БАБКА_КРАШ, АССЕТЫ, МАСТЕРСТВО } from "../config";
import { Картинка } from "../components/Icon";
import { Т } from "../texts";
import Эм from "../components/Emoji";
import { инфоМастерства, бонусНаУровне, подсказкаТребования } from "../game/mastery";
import LockIcon from "../components/LockIcon";
import { useRecordHolders } from "../lib/useMastery";

// Список мини-игр: сетка карточек в 2 колонки (по макету).
// Обложка: public/assets/ui/game-<id>.png. Нет файла — большой эмодзи.
// Чтобы добавить новую игру — добавьте ещё один объект в список ниже.
export default function MiniGames() {
  const { user } = useUser();
  const держатели = useRecordHolders();
  const [открыта, setОткрыта] = useState<string | null>(null);
  if (!user) return null;

  const игры = [
    { id: "babka", путь: "/games/babka", эмодзи: "👵", название: Т.игры.бабка.название, описание: Т.игры.бабка.описание(БАБКА_КРАШ.награда.старт), рекорд: Т.игры.бабка.рекорд(user.best_babka_crash ?? 0) },
    { id: "match3", путь: "/games/match3", эмодзи: "🍬", название: Т.игры.три_в_ряд.название, описание: Т.игры.три_в_ряд.описание(ТРИ_В_РЯД.колонки, ТРИ_В_РЯД.строки), рекорд: Т.игры.три_в_ряд.рекорд(user.best_match3 ?? 0) },
    { id: "ksuha", путь: "/games/ksuha-run", эмодзи: "🏃‍♀️", название: Т.игры.ksuha.название, описание: Т.игры.ksuha.описание(КСЮХА_РАН.препятствийЗаФишку), рекорд: Т.игры.ksuha.рекорд(user.best_ksuha_run ?? 0) },
    { id: "jira", путь: "/games/jira", эмодзи: "🔷", название: Т.игры.jira.название, описание: Т.игры.jira.описание(ДЖИРА_ФАЙТ.награды.заДоску, ДЖИРА_ФАЙТ.награды.заУровень), рекорд: Т.игры.jira.рекорд(user.best_jira_level ?? 0) },
    { id: "puzzle", путь: "/games/puzzle", эмодзи: "🧩", название: Т.игры.пятнашки.название, описание: Т.игры.пятнашки.описание(ПЯТНАШКИ.дзен.награда, ПЯТНАШКИ.наВремя.наградаЗаСборку), рекорд: Т.игры.пятнашки.рекорд(user.puzzles_solved ?? 0) },
  ];

  const открытаИгра = игры.find((и) => и.id === открыта);
  const инфоОткрытой = открытаИгра ? инфоМастерства(открытаИгра.id, user.mastery) : null;
  return (
    <div className="px-4">
      <h2 className="text-2xl font-bold">{Т.списокИгр.заголовок}</h2>
      <p className="mb-4 text-sm text-muted">{Т.списокИгр.подзаголовок}</p>
      <div className="grid grid-cols-2 gap-3">
        {игры.map((и) => { const инф = инфоМастерства(и.id, user.mastery); return (
          <Link key={и.id} to={и.путь} className="card flex flex-col p-2.5 active:brightness-125">
            <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-surface2 text-6xl">
              <Картинка
                путь={`${АССЕТЫ.папки.ui}game-${и.id}.png`}
                fallback={<span>{и.эмодзи}</span>}
                className="h-full w-full object-cover"
              />
              {держатели.has(и.id) && (<><span className="record-shimmer absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[11px] font-extrabold ring-1 ring-amber-100/80">+{Math.round(МАСТЕРСТВО.рекордБонус * 100)}%</span>
                </>)}
            </div>
            <div className="mt-2 text-sm font-bold">{и.название}</div>
            <div className="line-clamp-2 text-[11px] leading-snug text-muted"><Эм>{и.описание}</Эм></div>
            <div className="mt-1 text-[11px] font-semibold text-brand-yellow">{и.рекорд}</div>
            <div role="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setОткрыта(и.id); }} className="mt-1.5 flex cursor-pointer items-center gap-1.5">
              <div className={`relative h-3 flex-1 overflow-hidden rounded-full bg-black/50 ring-1 ring-white/10 ${инф.заблокирован ? "opacity-40 grayscale" : ""}`}>
                <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-300" style={{ width: `${инф.прогресс * 100}%` }} />
              </div>
              {инф.заблокирован && <LockIcon className="h-3.5 w-3.5 shrink-0 text-orange-300" />}
              <span className="text-[11px] font-bold">Ур. {инф.уровень}</span>
            </div>
          </Link>
        ); })}
      </div>
      {открытаИгра && инфоОткрытой && createPortal(
        <Modal тон="calm" onClose={() => setОткрыта(null)}>
          <div className={инфоОткрытой.заблокирован ? "brightness-75" : ""}>
          <h3 className="text-lg font-bold">Мастерство · {открытаИгра.название}</h3>
          {инфоОткрытой.заблокирован ? (
            <p className="mb-4 flex items-start gap-2 rounded-xl bg-black/40 px-3 py-2 text-xs font-semibold text-orange-200 ring-1 ring-orange-300/40">
              <LockIcon className="mt-px h-3.5 w-3.5 shrink-0" />
              {подсказкаТребования(инфоОткрытой.следующее)}
            </p>
          ) : (
            <p className="mb-4 text-xs text-white/60">Каждый уровень увеличивает доход с этой игры.</p>
          )}
          {держатели.has(открытаИгра.id) && (
            <p className="mb-3 rounded-xl bg-amber-300/15 px-3 py-2 text-xs font-semibold text-amber-200 ring-1 ring-amber-300/50">Рекорд: +{Math.round(МАСТЕРСТВО.рекордБонус * 100)}% к доходу сверху</p>
          )}
          <div className="mb-1.5 flex items-baseline justify-between text-sm font-bold">
            <span>Ур. {инфоОткрытой.уровень} из {МАСТЕРСТВО.максУровень}</span>
            <span className="tabular-nums">+{Math.round((инфоОткрытой.бонус - 1) * 100)}%</span>
          </div>
          <div className="mb-4 h-2.5 overflow-hidden rounded-full bg-black/40 ring-1 ring-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-yellow-400 transition-[width] duration-500" style={{ width: `${Math.round(инфоОткрытой.прогресс * 100)}%` }} />
          </div>
          <ul className="max-h-[50vh] space-y-1.5 overflow-y-auto pr-1 text-left text-xs">
            {Array.from({ length: МАСТЕРСТВО.максУровень }, (_, i) => i + 1).map((ур) => {
              const пройден = ур < инфоОткрытой.уровень;
              const текущий = ур === инфоОткрытой.уровень;
              const закрыто = ур > инфоОткрытой.уровень && ур > МАСТЕРСТВО.отрывУровней;
              return (
                <li key={ур} className={`rounded-xl px-3 py-2 ${текущий ? "bg-amber-300/20 ring-1 ring-amber-300/70" : пройден ? "opacity-35" : "bg-white/5"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold">Ур. {ур}</span>
                    <span className="inline-flex items-center gap-1 font-bold text-amber-200">+{Math.round(бонусНаУровне(ур) * 100)}%</span>
                  </div>
                  {закрыто && (
                    <div className="mt-1 text-[11px] font-semibold text-orange-300">Нужно: 2 другие игры на уровне {ур - МАСТЕРСТВО.отрывУровней}+</div>
                  )}
                </li>
              );
            })}
          </ul>
          </div>
        </Modal>,
        document.body,
      )}
    </div>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import { useUser } from "../store/UserContext";
import { КСЮХА_РАН, ПЯТНАШКИ, ТРИ_В_РЯД, ДЖИРА_ФАЙТ, БАБКА_КРАШ, АССЕТЫ, МАСТЕРСТВО } from "../config";
import { Картинка } from "../components/Icon";
import { Т } from "../texts";
import Эм from "../components/Emoji";
import { инфоМастерства } from "../game/mastery";
import LockIcon from "../components/LockIcon";
import MasteryPopup from "../components/MasteryPopup";
import { навыкиИгры } from "../game/skills";
import { useRecordHolders } from "../lib/useMastery";

// Список мини-игр: сетка карточек в 2 колонки (по макету).
// Обложка: public/assets/ui/game-<id>.png. Нет файла — большой эмодзи.
// Чтобы добавить новую игру — добавьте ещё один объект в список ниже.
export default function MiniGames() {
  const { user, isAdmin } = useUser();
  const держатели = useRecordHolders();
  const [открыта, setОткрыта] = useState<string | null>(null);
  if (!user) return null;

  const игры = [
    { id: "babka", путь: "/games/babka", эмодзи: "👵", название: Т.игры.бабка.название, описание: Т.игры.бабка.описание(БАБКА_КРАШ.награда.старт), рекорд: Т.игры.бабка.рекорд(user.best_babka_crash ?? 0) },
    { id: "match3", путь: "/games/match3", эмодзи: "🍬", название: Т.игры.три_в_ряд.название, описание: Т.игры.три_в_ряд.описание(ТРИ_В_РЯД.колонки, ТРИ_В_РЯД.строки), рекорд: Т.игры.три_в_ряд.рекорд(user.best_match3 ?? 0) },
    { id: "ksuha", путь: "/games/ksuha-run", эмодзи: "🏃‍♀️", название: Т.игры.ksuha.название, описание: Т.игры.ksuha.описание(), рекорд: Т.игры.ksuha.рекорд(user.best_ksuha_run ?? 0) },
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
              {держатели.has(и.id) && (<><span className="record-shimmer absolute right-1.5 top-1.5 rounded-full px-2 py-0.5 text-[11px] font-extrabold ring-1 ring-amber-100/80">+{Math.round(МАСТЕРСТВО.рекордБонус * 100)}%</span>
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
      {isAdmin && (
        <Link to="/games/drift-boss" className="card mt-3 flex items-center gap-3 p-3 active:brightness-125">
          <span className="text-3xl">🚗</span>
          <span className="text-sm font-bold">{Т.дрифтБосс.карточка}</span>
        </Link>
      )}
      {открытаИгра && инфоОткрытой && (
        <MasteryPopup
          навыки={открытаИгра.id === "ksuha" ? навыкиИгры("ksuha") : открытаИгра.id === "match3" ? навыкиИгры("match3") : []}
          название={открытаИгра.название}
          инфо={{ ...инфоОткрытой, процент: Math.round((инфоОткрытой.бонус - 1) * 100) }}
          держатель={держатели.has(открытаИгра.id)}
          onClose={() => setОткрыта(null)}
        />
      )}
    </div>
  );
}

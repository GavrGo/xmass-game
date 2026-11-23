import { Link } from "react-router-dom";
import { useUser } from "../store/UserContext";
import { КСЮХА_РАН, ПЯТНАШКИ, ТРИ_В_РЯД, ДЖИРА_ФАЙТ, БАБКА_КРАШ, АССЕТЫ } from "../config";
import { Картинка } from "../components/Icon";
import { Т } from "../texts";
import Эм from "../components/Emoji";
import { уровеньМастерства } from "../game/mastery";
import { useRecordHolders } from "../lib/useMastery";

// Список мини-игр: сетка карточек в 2 колонки (по макету).
// Обложка: public/assets/ui/game-<id>.png. Нет файла — большой эмодзи.
// Чтобы добавить новую игру — добавьте ещё один объект в список ниже.
export default function MiniGames() {
  const { user } = useUser();
  const держатели = useRecordHolders();
  if (!user) return null;

  const игры = [
    { id: "babka", путь: "/games/babka", эмодзи: "👵", название: Т.игры.бабка.название, описание: Т.игры.бабка.описание(БАБКА_КРАШ.награда.старт), рекорд: Т.игры.бабка.рекорд(user.best_babka_crash ?? 0) },
    { id: "match3", путь: "/games/match3", эмодзи: "🍬", название: Т.игры.три_в_ряд.название, описание: Т.игры.три_в_ряд.описание(ТРИ_В_РЯД.колонки, ТРИ_В_РЯД.строки), рекорд: Т.игры.три_в_ряд.рекорд(user.best_match3 ?? 0) },
    { id: "ksuha", путь: "/games/ksuha-run", эмодзи: "🏃‍♀️", название: Т.игры.ksuha.название, описание: Т.игры.ksuha.описание(КСЮХА_РАН.препятствийЗаФишку), рекорд: Т.игры.ksuha.рекорд(user.best_ksuha_run ?? 0) },
    { id: "jira", путь: "/games/jira", эмодзи: "🔷", название: Т.игры.jira.название, описание: Т.игры.jira.описание(ДЖИРА_ФАЙТ.награды.заДоску, ДЖИРА_ФАЙТ.награды.заУровень), рекорд: Т.игры.jira.рекорд(user.best_jira_level ?? 0) },
    { id: "puzzle", путь: "/games/puzzle", эмодзи: "🧩", название: Т.игры.пятнашки.название, описание: Т.игры.пятнашки.описание(ПЯТНАШКИ.дзен.награда, ПЯТНАШКИ.наВремя.наградаЗаСборку), рекорд: Т.игры.пятнашки.рекорд(user.puzzles_solved ?? 0) },
  ];

  return (
    <div className="px-4">
      <h2 className="text-2xl font-bold">{Т.списокИгр.заголовок}</h2>
      <p className="mb-4 text-sm text-muted">{Т.списокИгр.подзаголовок}</p>
      <div className="grid grid-cols-2 gap-3">
        {игры.map((и) => (
          <Link key={и.id} to={и.путь} className="card flex flex-col p-2.5 active:brightness-125">
            <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-surface2 text-6xl">
              <Картинка
                путь={`${АССЕТЫ.папки.ui}game-${и.id}.png`}
                fallback={<span>{и.эмодзи}</span>}
                className="h-full w-full object-cover"
              />
              {держатели.has(и.id) && (
                <span className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 ring-1 ring-brand-yellow/60" aria-label="Рекорд">
                  <Картинка путь="assets/icons/record-badge.svg" fallback={<svg viewBox="0 0 24 24" className="h-4 w-4" fill="#FFC83A"><path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3z" /></svg>} className="h-4 w-4" />
                </span>
              )}
            </div>
            <div className="mt-2 text-sm font-bold">{и.название}</div>
            <div className="line-clamp-2 text-[11px] leading-snug text-muted"><Эм>{и.описание}</Эм></div>
            <div className="mt-1 text-[11px] font-semibold text-brand-yellow">{и.рекорд}</div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-black/50 ring-1 ring-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-300" style={{ width: `${уровеньМастерства(user.mastery?.[и.id]?.xp ?? 0).прогресс * 100}%` }} />
              </div>
              <span className="text-[11px] font-bold">Ур. {уровеньМастерства(user.mastery?.[и.id]?.xp ?? 0).уровень}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

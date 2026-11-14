import { Link } from "react-router-dom";
import { useUser } from "../store/UserContext";
import { КСЮХА_РАН, ПЯТНАШКИ, ТРИ_В_РЯД, ДЖИРА_ФАЙТ, БАБКА_КРАШ, АССЕТЫ } from "../config";
import { Картинка } from "../components/Иконка";
import { Т } from "../texts";

// Список мини-игр: сетка карточек в 2 колонки (по макету).
// Обложка: public/assets/ui/game-<id>.png. Нет файла — большой эмодзи.
// Чтобы добавить новую игру — добавьте ещё один объект в список ниже.
export default function MiniGames() {
  const { user } = useUser();
  if (!user) return null;

  const игры = [
    { id: "babka", путь: "/games/babka", эмодзи: "👵", название: Т.игры.бабка.название, описание: Т.игры.бабка.описание(БАБКА_КРАШ.награда.старт), рекорд: Т.игры.бабка.рекорд(user.best_babka_crash ?? 0) },
    { id: "match3", путь: "/games/match3", эмодзи: "🍬", название: Т.игры.три_в_ряд.название, описание: Т.игры.три_в_ряд.описание(ТРИ_В_РЯД.размер), рекорд: Т.игры.три_в_ряд.рекорд(user.best_match3 ?? 0) },
    { id: "puzzle", путь: "/games/puzzle", эмодзи: "🧩", название: Т.игры.пятнашки.название, описание: Т.игры.пятнашки.описание(ПЯТНАШКИ.дзен.награда, ПЯТНАШКИ.наВремя.наградаЗаСборку), рекорд: Т.игры.пятнашки.рекорд(user.puzzles_solved ?? 0) },
    { id: "jira", путь: "/games/jira", эмодзи: "🔷", название: Т.игры.jira.название, описание: Т.игры.jira.описание(ДЖИРА_ФАЙТ.награды.заДоску, ДЖИРА_ФАЙТ.награды.заУровень), рекорд: Т.игры.jira.рекорд(user.best_jira_level ?? 0) },
    { id: "ksuha", путь: "/games/ksuha-run", эмодзи: "🏃‍♀️", название: Т.игры.ksuha.название, описание: Т.игры.ksuha.описание(КСЮХА_РАН.препятствийЗаФишку), рекорд: Т.игры.ksuha.рекорд(user.best_ksuha_run ?? 0) },
  ];

  return (
    <div className="px-4">
      <h2 className="text-2xl font-bold">{Т.списокИгр.заголовок}</h2>
      <p className="mb-4 text-sm text-muted">{Т.списокИгр.подзаголовок}</p>
      <div className="grid grid-cols-2 gap-3">
        {игры.map((и) => (
          <Link key={и.id} to={и.путь} className="card flex flex-col p-2.5 active:brightness-125">
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-surface2 text-6xl">
              <Картинка
                путь={`${АССЕТЫ.папки.ui}game-${и.id}.png`}
                fallback={<span>{и.эмодзи}</span>}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="mt-2 text-sm font-bold">{и.название}</div>
            <div className="line-clamp-2 text-[11px] leading-snug text-muted">{и.описание}</div>
            <div className="mt-1 text-[11px] font-semibold text-brand-yellow">{и.рекорд}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { useUser } from "../store/UserContext";
import { МАСТЕРСТВО } from "../config";
import { сегодня, уровеньМастерства } from "../game/mastery";
import { getGlobalRecord, type КолонкаРекорда } from "../api/users";

const КОЛОНКА_РЕКОРДА: Record<string, КолонкаРекорда> = {
  babka: "best_babka_crash",
  match3: "best_match3",
  jira: "best_jira_level",
  ksuha: "best_ksuha_run",
  puzzle: "puzzles_solved",
};

export function useRecordHolders(): Set<string> {
  const { telegramId } = useUser();
  const [держатели, setДержатели] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!telegramId) return;
    let живой = true;
    Promise.all(
      Object.entries(КОЛОНКА_РЕКОРДА).map(async ([игра, колонка]) => {
        const рекорд = await getGlobalRecord(колонка);
        return рекорд?.telegram_id === telegramId ? игра : null;
      }),
    )
      .then((список) => { if (живой) setДержатели(new Set(список.filter((x): x is string => !!x))); })
      .catch(() => {});
    return () => { живой = false; };
  }, [telegramId]);
  return держатели;
}

export function сБонусом<T extends object>(награда: T, бонус: number): T {
  const копия = { ...награда } as Record<string, unknown>;
  for (const ключ of ["итог", "сумма"]) {
    if (typeof копия[ключ] === "number") копия[ключ] = Math.round((копия[ключ] as number) * бонус);
  }
  return копия as T;
}

export function useMastery(игра: string) {
  const { user, patch } = useUser();
  const userRef = useRef(user);
  userRef.current = user;
  const очки = useRef(0);
  const держатели = useRecordHolders();

  const уровень = уровеньМастерства(user?.mastery?.[игра]?.xp ?? 0).бонус;
  const рекорд = держатели.has(игра) ? 1 + МАСТЕРСТВО.рекордБонус : 1;
  const бонус = уровень * рекорд;

  const сохранить = async () => {
    const накоплено = очки.current;
    const текущий = userRef.current;
    if (накоплено === 0 || !текущий) return;
    очки.current = 0;

    const все = (текущий.mastery ?? {}) as NonNullable<typeof текущий.mastery>;
    const было = все[игра];
    const день = сегодня();
    const заДень = было?.день === день ? было.заДень : 0;
    const добавка = Math.min(накоплено, Math.max(0, МАСТЕРСТВО.потолокВДень - заДень));
    if (добавка === 0) return;

    await patch({
      mastery: { ...все, [игра]: { xp: (было?.xp ?? 0) + добавка, день, заДень: заДень + добавка } },
    });
  };

  useEffect(() => {
    const сброс = setInterval(сохранить, 30_000);
    return () => {
      clearInterval(сброс);
      сохранить();
    };
  }, [игра]);

  return {
    бонус,
    начислить: (фишки: number) => {
      очки.current += Math.floor(фишки / МАСТЕРСТВО.фишекНаОчко);
    },
  };
}

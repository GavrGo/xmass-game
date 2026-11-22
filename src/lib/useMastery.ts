import { useEffect, useRef, useState } from "react";
import { useUser } from "../store/UserContext";
import { МАСТЕРСТВО } from "../config";
import { уровеньМастерства } from "../game/mastery";
import { getGlobalRecord, type КолонкаРекорда } from "../api/users";

export interface Мастерство { уровень: number; прогресс: number; процент: number; рекордПроц: number }

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
  for (const ключ of ["итог", "итого", "сумма"]) {
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

  const инфо = уровеньМастерства(user?.mastery?.[игра]?.xp ?? 0);
  const рекордЕсть = держатели.has(игра);
  const бонус = инфо.бонус + (рекордЕсть ? МАСТЕРСТВО.рекордБонус : 0);
  const мастерство: Мастерство = {
    уровень: инфо.уровень,
    прогресс: инфо.прогресс,
    процент: Math.round((инфо.бонус - 1) * 100),
    рекордПроц: рекордЕсть ? Math.round(МАСТЕРСТВО.рекордБонус * 100) : 0,
  };

  const сохранить = async () => {
    const накоплено = очки.current;
    const текущий = userRef.current;
    if (накоплено === 0 || !текущий) return;
    очки.current = 0;

    const все = (текущий.mastery ?? {}) as NonNullable<typeof текущий.mastery>;
    const было = все[игра];
    await patch({
      mastery: { ...все, [игра]: { xp: (было?.xp ?? 0) + накоплено } },
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
    мастерство,
    начислить: (фишки: number) => {
      очки.current += Math.floor(фишки / МАСТЕРСТВО.фишекНаОчко);
    },
  };
}

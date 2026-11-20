import { useEffect, useRef } from "react";
import { useUser } from "../store/UserContext";
import { МАСТЕРСТВО } from "../config";
import { сегодня } from "../game/mastery";

export function useMastery(игра: string) {
  const { user, patch } = useUser();
  const userRef = useRef(user);
  userRef.current = user;
  const очки = useRef(0);

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
    const тик = setInterval(() => { очки.current += 1; }, МАСТЕРСТВО.секундНаОчко * 1000);
    const сброс = setInterval(сохранить, 30_000);
    return () => {
      clearInterval(тик);
      clearInterval(сброс);
      сохранить();
    };
  }, [игра]);
}

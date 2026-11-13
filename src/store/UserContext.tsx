// Хранит текущего игрока и раздаёт его всем экранам.
import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { getTelegramId } from "../lib/telegram";
import { getUser, createUser, updateUser } from "../api/users";
import { supabase } from "../lib/supabase";
import type { User } from "../types";

// Изменение баланса: положительное число — прибавить, отрицательное — списать.
export interface Изменение { chips?: number; tickets?: number; hearts?: number }

interface Ctx {
  telegramId: number | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  register: (nickname: string, emoji: string) => Promise<void>;
  patch: (p: Partial<User>) => Promise<void>;
  /** Изменить баланс (и, при желании, другие поля, например уровень прокачки).
   *  Экран обновляется мгновенно, потом данные сохраняются в Supabase.
   *  Если не хватает средств — бросает ошибку и ничего не меняет. */
  change: (delta: Изменение, extra?: Partial<User>) => Promise<void>;
}

const UserCtx = createContext<Ctx>(null as unknown as Ctx);
export const useUser = () => useContext(UserCtx);

export function UserProvider({ children }: { children: ReactNode }) {
  const telegramId = getTelegramId();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Всегда актуальная копия игрока (чтобы быстрые подряд изменения считались верно)
  const userRef = useRef<User | null>(null);
  const записать = (u: User | null) => { userRef.current = u; setUser(u); };

  // Загружаем игрока при старте
  useEffect(() => {
    if (!telegramId) { setLoading(false); return; }
    getUser(telegramId)
      .then(записать)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [telegramId]);

  // Realtime: любые изменения в базе (в т.ч. от админа) сразу видны на всех экранах
  useEffect(() => {
    if (!telegramId) return;
    const ch = supabase
      .channel("user-" + telegramId)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "users", filter: `telegram_id=eq.${telegramId}` },
        (payload) => {
          if (payload.eventType === "DELETE") записать(null);
          else записать(payload.new as User);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [telegramId]);

  const register = async (nickname: string, emoji: string) => {
    if (!telegramId) return;
    записать(await createUser(telegramId, nickname, emoji));
  };

  const patch = async (p: Partial<User>) => {
    if (!telegramId) return;
    записать(await updateUser(telegramId, p));
  };

  const change = async (delta: Изменение, extra: Partial<User> = {}) => {
    const текущий = userRef.current;
    if (!текущий) throw new Error("Игрок не загружен");

    const новый: User = {
      ...текущий,
      ...extra,
      chips: текущий.chips + (delta.chips ?? 0),
      tickets: текущий.tickets + (delta.tickets ?? 0),
      hearts: текущий.hearts + (delta.hearts ?? 0),
    };
    if (новый.chips < 0 || новый.tickets < 0 || новый.hearts < 0) {
      throw new Error("Недостаточно средств");
    }

    записать(новый); // 1) сразу показываем на экране
    try {
      // 2) сохраняем в Supabase
      await updateUser(текущий.telegram_id, {
        chips: новый.chips, tickets: новый.tickets, hearts: новый.hearts, ...extra,
      });
    } catch (e) {
      записать(текущий); // не сохранилось — откатываем
      throw e;
    }
  };

  return (
    <UserCtx.Provider value={{ telegramId, user, loading, error, register, patch, change }}>
      {children}
    </UserCtx.Provider>
  );
}

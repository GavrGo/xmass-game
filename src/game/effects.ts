// Здесь считается, как уровни прокачек влияют на игру.
// Все числа берутся из config.ts.
import { ПРОКАЧКИ, СЛОТ, ОБМЕН } from "../config";
import type { User } from "../types";

/** Шанс бесплатной крутки в % (с учётом прокачки Free Spin и потолка). */
export function шансБесплатнойКрутки(user: Pick<User, "free_spin_level">): number {
  const шанс = СЛОТ.базовыйШансБесплатнойКрутки + user.free_spin_level * ПРОКАЧКИ.freeSpin.эффектЗаУровень;
  return Math.min(шанс, СЛОТ.максШансБесплатнойКрутки);
}

/** Текущая комиссия обмена в % (с учётом прокачки «Договоримся»). */
export function комиссияОбменаПроц(user: Pick<User, "exchange_level">): number {
  const к = ОБМЕН.базоваяКомиссияПроцентов - user.exchange_level * ПРОКАЧКИ.exchange.эффектЗаУровень;
  return Math.max(к, ОБМЕН.минимальнаяКомиссияПроцентов);
}

/** Бонус к награде фишками из мини-игр, в %. (Понадобится на этапе мини-игр.) */
export function бонусЗарплатыПроц(user: Pick<User, "salary_level">): number {
  return user.salary_level * ПРОКАЧКИ.salary.эффектЗаУровень;
}

/** Дополнительные секунды к таймерам мини-игр. (Понадобится на этапе мини-игр.) */
export function бонусВремениСек(user: Pick<User, "time_level">): number {
  return user.time_level * ПРОКАЧКИ.timeBonus.эффектЗаУровень;
}

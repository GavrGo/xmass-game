// Общая помощь для окон результата: кто сейчас держит глобальный рекорд.
import { getGlobalRecord, КолонкаРекорда, Рекорд } from "../api/users";

/**
 * Глобальный рекорд с учётом вашего результата: если ваш результат не ниже рекорда в базе
 * (или базу ещё не успели обновить) — рекордсмен вы.
 */
export async function глобальныйРекорд(
  колонка: КолонкаРекорда,
  мой: number,
  u: { telegram_id: number; nickname: string }
): Promise<Рекорд | null> {
  const г = await getGlobalRecord(колонка);
  if (г && г.значение >= мой) return г;
  return мой > 0 ? { telegram_id: u.telegram_id, nickname: u.nickname, значение: мой } : null;
}

// Тактильная отдача (вибрация) через Telegram Mini Apps API.
// На iPhone даёт приятные «тики» как в будильнике, на Android — обычную вибрацию.
// Если Telegram API недоступен — молча ничего не делает.

type Стиль = "light" | "medium" | "heavy" | "rigid" | "soft";

function tg(): any {
  try { return (window as any).Telegram?.WebApp; } catch { return null; }
}

/** Короткий удар (impact). Стили: light / medium / heavy / rigid / soft */
export function хаптик(стиль: Стиль = "light") {
  try {
    const h = tg()?.HapticFeedback;
    if (h?.impactOccurred) h.impactOccurred(стиль);
  } catch {}
}

/** Щелчок выбора (как прокрутка пикера). */
export function хаптикВыбор() {
  try {
    const h = tg()?.HapticFeedback;
    if (h?.selectionChanged) h.selectionChanged();
  } catch {}
}

/** Уведомление: success / warning / error */
export function хаптикУведомление(тип: "success" | "warning" | "error") {
  try {
    const h = tg()?.HapticFeedback;
    if (h?.notificationOccurred) h.notificationOccurred(тип);
  } catch {}
}

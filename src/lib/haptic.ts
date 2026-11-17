// Тактильная отдача (вибрация) через Telegram Mini Apps API.
// Уважает настройку «вибрация выкл» из localStorage.

type Стиль = "light" | "medium" | "heavy" | "rigid" | "soft";

function tg(): any {
  try { return (window as any).Telegram?.WebApp; } catch { return null; }
}

function вибрацияВключена(): boolean {
  try { return localStorage.getItem("100hp_haptic_on") !== "0"; } catch { return true; }
}

export function хаптик(стиль: Стиль = "light") {
  if (!вибрацияВключена()) return;
  try {
    const h = tg()?.HapticFeedback;
    if (h?.impactOccurred) h.impactOccurred(стиль);
  } catch {}
}

export function хаптикВыбор() {
  if (!вибрацияВключена()) return;
  try {
    const h = tg()?.HapticFeedback;
    if (h?.selectionChanged) h.selectionChanged();
  } catch {}
}

export function хаптикУведомление(тип: "success" | "warning" | "error") {
  if (!вибрацияВключена()) return;
  try {
    const h = tg()?.HapticFeedback;
    if (h?.notificationOccurred) h.notificationOccurred(тип);
  } catch {}
}
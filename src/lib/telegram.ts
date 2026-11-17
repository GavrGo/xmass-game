// Подключение Telegram WebApp: ready, expand, тема.

// Минимальное описание того, что берём из window.Telegram
declare global {
  interface Window {
    Telegram?: { WebApp: any };
  }
}

export const tg = window.Telegram?.WebApp;

/** Вызвать один раз при старте приложения. */
export function initTelegram() {
  if (!tg) return; // открыто в обычном браузере — просто пропускаем
  tg.ready();   // сообщаем Telegram, что приложение загрузилось
  tg.expand();  // раскрываем на весь экран
  applyTheme();
  tg.onEvent("themeChanged", applyTheme);
}

/** Переносим цвета темы Telegram в CSS-переменные (см. index.css). */
function applyTheme() {
  if (!tg) return;
  const p = tg.themeParams || {};
  const root = document.documentElement.style;
  if (p.bg_color) root.setProperty("--tg-bg", p.bg_color);
  if (p.text_color) root.setProperty("--tg-text", p.text_color);
  try {
    tg.setHeaderColor?.("#0f1a14");
    tg.setBackgroundColor?.("#0f1a14");
  } catch {}
}

/** telegram_id текущего игрока. В браузере берём тестовый из .env. */
export function getTelegramId(): number | null {
  const id = tg?.initDataUnsafe?.user?.id;
  if (id) return Number(id);
  // Тестовый id работает ТОЛЬКО при локальной разработке (npm run dev).
  // В опубликованной версии (Vercel) его нет — игрок определяется только через Telegram.
  if (import.meta.env.DEV) {
    const dev = import.meta.env.VITE_DEV_TELEGRAM_ID;
    return dev ? Number(dev) : null;
  }
  return null;
}

/** Верхний отступ в полноэкранном режиме (чтобы кнопки Telegram не перекрывали игру). */
export function getSafeTop(): number {
  if (!tg) return 0;
  return (tg.safeAreaInset?.top ?? 0) + (tg.contentSafeAreaInset?.top ?? 0);
}

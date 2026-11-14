# 100HP Christmas — Telegram Mini App

## Запуск
1. Установите Node.js 18+
2. `npm install`
3. Скопируйте `.env.example` в `.env` и заполните (URL и anon-ключ Supabase; для теста в браузере — VITE_DEV_TELEGRAM_ID)
4. В Supabase → SQL Editor выполните содержимое `supabase.sql`
5. `npm run dev` → http://localhost:5173
6. Для Telegram нужен https-туннель: `npx cloudflared tunnel --url http://localhost:5173`

## Админка
Откройте `/admin`. Доступ только если ваш telegram_id есть в таблице `admins`:
`insert into public.admins (telegram_id) values (ВАШ_ID);`

## Все числа игры — в `src/config.ts`

## Безопасность
Сейчас RLS-политики открытые (для разработки). Перед запуском для реальных игроков
нужна серверная проверка initData (Supabase Edge Function) и перенос логики покупок/слота на сервер.

## Этап 2
Добавлены: слот (src/game/slot.ts, components/SlotReels.tsx), обменник, прокачки с покупкой, функция change() в UserContext.
Базу менять не нужно.

## Этап 3 (админка)
Кнопка «Админка» на главном экране для админов, /admin с поиском, vercel.json для маршрутов.
На Vercel задайте переменные VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY. VITE_DEV_TELEGRAM_ID на Vercel НЕ задавайте.

## Этап 4 (Ksuha Run)
В существующей базе выполните migrations/002_ksuha_run.sql (добавляет колонку best_ksuha_run).
Настройки игры: src/config.ts, раздел КСЮХА_РАН.

## Этап 5
Ksuha Run: полный экран, меню сложностей, монеты, погоня. Слот: 5 символов, эффекты, бомбы. Лидерборд по хэпэшкам.
ВАЖНО: выполните migrations/002_ksuha_run.sql в Supabase.

## Этап 6
Слот: множитель ставки x1/x3/x5/x10. Обмен: смена ника и крутки аватарки. Пятнашки.
В Supabase выполните: migrations/002_ksuha_run.sql (если ещё нет) и migrations/003_puzzles.sql.
Картинки для Пятнашек кладите в public/puzzles/ (квадратные, лучше 800x800) — список подхватывается автоматически.

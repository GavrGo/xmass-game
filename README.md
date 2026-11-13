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

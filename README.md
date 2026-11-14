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

## Этап 7
Рекорды с никами во всех окнах результата, режим «Бесконечный» в Ksuha Run, Пятнашки на 3 минуты, игра «3 в ряд».
В Supabase выполните migrations/004_match3.sql. Картинки символов — в public/match3/.

## Этап 8
3 в ряд: колонка рекорда теперь best_match3, вспышка при 4 в ряд, покачивание иконок. Новая игра Jira Fight.
В Supabase выполните: ALTER TABLE public.users ADD COLUMN IF NOT EXISTS best_jira_level integer DEFAULT 0;  (migrations/005_jira_fight.sql)

## Этап 9
Только тапы во всех играх, анимация крутки аватара, единый вид модалок результатов, Jira Fight на время короче, новая игра Babka Crash.
В Supabase выполните: ALTER TABLE public.users ADD COLUMN IF NOT EXISTS best_babka_crash integer DEFAULT 0;  (migrations/006_babka_crash.sql)

## Этап 10: тексты, дизайн, картинки, звуки

### Тексты
ВСЕ тексты игры лежат в `src/texts.ts`. Меняете строку — она меняется по всей игре.
Числа (цены, награды, время) — отдельно, в `src/config.ts`.

### Картинки (public/assets/)
- `icons/` — иконки валют, нижнего меню, звука, слота (`slot-<id>.png`), прокачек (`upgrade-<ключ>.png`)
- `backgrounds/` — фоны экранов
- `ui/` — кнопка слота, картинка приветствия, обложки игр (`game-<id>.png`)
- `characters/` — персонажи (заставка, обмен, лидерборд)
Имена файлов — в `src/config.ts`, раздел `АССЕТЫ` (и в README.txt внутри каждой папки).
Нет файла — показывается эмодзи/стандартное оформление. Файл положили — подхватывается сам.
При запуске `npm run dev` новые файлы видны сразу после обновления страницы.
На Vercel после добавления файлов нужен новый деплой (список файлов строится при сборке).

### Звуки (public/sounds/)
- `music/` — фоновая музыка (`main.mp3` — обычные экраны, `game.mp3` — в играх)
- `sfx/` — короткие звуки (`click`, `win`, `lose`, `coin`, `jump`, `spin`, `boom`, `buy`, `error`, `move`, `bonus`)
Имена и громкость — в `src/config.ts`, раздел `ЗВУКИ`.
Звуковой менеджер: `src/lib/sound.ts`. В коде звук включается так: `звук.sfx("победа")`, музыка: `звук.музыка("игра")`.
Клик по любой кнопке озвучивается автоматически.

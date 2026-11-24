# Карта проекта xmass-game

Стек: React + TypeScript + Vite + Tailwind + react-router. Telegram Mini App. Деплой: Vercel (vercel.json). Данные: Supabase (supabase.sql, migrations/, src/lib/supabase.ts).

## Где что лежит

### Точка входа
- `src/main.tsx`, `src/App.tsx` — запуск и маршрутизация экранов.
- `src/index.css`, `src/theme.ts`, `tailwind.config.js` — стили и тема.

### Экраны (`src/screens/`)
- `Preloader.tsx`, `Onboarding.tsx`, `Home.tsx` — старт и главный экран.
- `MiniGames.tsx` — список мини-игр.
- `Match3.tsx` — три в ряд. Правила и числа берутся из `src/config.ts` (`ТРИ_В_РЯД`), прогресс этапов — `MatchProgress.tsx`. `src/game/match3.ts` в экран не импортируется, проверять перед правкой.
- `KsuhaRun.tsx` — бег Ksuha Run (логика в `src/game/ksuhaRun.ts`).
- `Babka.tsx` — игра Бабка (логика в `src/game/babka.ts`).
- `Puzzle.tsx` — пазл (логика в `src/game/puzzle.ts`, картинки в `puzzleImages.ts`).
- `JiraFight.tsx` — мини-игра Jira Fight (логика в `src/game/jira.ts`).
- `Blackjack.tsx` — блэкджек (логика в `src/game/blackjack.ts`).
- `Exchange.tsx` — обмен (логика в `src/game/exchange.ts`).
- `Upgrades.tsx` — улучшения.
- `Leaderboard.tsx` — таблица лидеров.

### Игровая логика (`src/game/`)
- `skills.ts` — список навыков и их привязка к играм.
- `mastery.ts` — мастерство по играм.
- `artifacts.ts`, `slot.ts`, `slotXp.ts`, `wheel.ts`, `records.ts`, `emoji.ts`, `effects.ts` — артефакты, слоты, опыт слотов, колесо, рекорды, эмодзи, эффекты.

### Компоненты (`src/components/`)
- Общие: `Layout.tsx`, `TopBar.tsx`, `BottomNav.tsx`, `Modal.tsx`, `GameMenu.tsx`, `GameResult.tsx`, `Icon.tsx`, `Emoji.tsx`, `BalancePills.tsx`.
- Слоты: `SlotReels.tsx`, `SlotEffects.tsx`, `SlotXpBar.tsx`, `SpinButton.tsx`, `AutoSpinButton.tsx`, `AvatarSpinModal.tsx`.
- Дуэли: `DuelModal.tsx`, `DuelToast.tsx`.
- Прочее: `MasteryPopup.tsx`, `MatchProgress.tsx`, `BlackMarket.tsx`, `FortuneWheel.tsx`, `MerchantStage.tsx`, `LevelBanner.tsx`, `Fireworks.tsx`, `Sparks.tsx`, `FlashesCanvas.tsx`, `PlayingCard.tsx`, `RecordsBlock.tsx`, `SpeechBubble.tsx`, `TotalRow.tsx`, `WheelParts.tsx`, `LockIcon.tsx`.

### Настройки и тексты
- `src/config.ts` — все числа баланса (очки, этапы, награды, навыки, порог уровней). Числа менять только здесь.
- `src/texts.ts` — тексты интерфейса и подписи.
- `src/types.ts` — общие типы.

### Данные и сервер
- `src/lib/supabase.ts` — клиент Supabase.
- `src/api/duels.ts`, `src/api/users.ts` — запросы дуэлей и пользователей.
- `src/store/UserContext.tsx` — состояние пользователя.
- `src/lib/` — хуки и утилиты: `useMastery.ts`, `useGlobalRecord.ts`, `useDuelNotices.ts`, `useIncomingDuels.ts`, `useNoSwipes.ts`, `useFinalFreeze.ts`, `sound.ts`, `haptic.ts`, `telegram.ts`, `format.ts`, `stats.ts`, `assets.ts`, `spriteBox.ts`, `spiralTransition.ts`, `final.ts`.
- `api/broadcast.js`, `api/notify.js` — серверные функции Vercel (уведомления в Telegram через бота).
- `migrations/` — миграции `002`–`013`, `supabase.sql` — базовая схема. `013` — таблица `record_notices` и триггеры смены глобального рекорда.
- `src/api/records.ts`, `src/components/RecordToast.tsx` — уведомления о смене глобального рекорда (Telegram + всплывашка при входе в игру).

### Админка
- `src/admin/` — `AdminPage.tsx`, `AdminStats.tsx`, `AdminBroadcast.tsx`.

### Ресурсы
- `public/` — картинки и статика (в т.ч. `public/match3/`).
- `assets/`, `sounds/`, `puzzles/`, `match3/` — медиафайлы.

## Правила работы

0. В начале любой правки открывать этот файл и не искать код заново по всему проекту.
1. Числа баланса правим только в `src/config.ts`, не в экранах.
2. Тексты интерфейса — в `src/texts.ts`.
3. После изменений проверять `npx tsc --noEmit` и `npx vite build`.
4. Результат отдавать архивом zip в `/home/user/deliver/` с номером версии. 
5. Если меняется структура файлов, обновить эту карту.

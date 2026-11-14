-- ЕСЛИ БАЗА УЖЕ СОЗДАНА: выполните это один раз в Supabase → SQL Editor.
-- Добавляет колонку с личным рекордом игрока в Ksuha Run.
alter table public.users
  add column if not exists best_ksuha_run integer not null default 0;

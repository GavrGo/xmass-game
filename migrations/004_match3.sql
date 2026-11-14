-- ВЫПОЛНИТЬ ОДИН РАЗ в Supabase → SQL Editor.
-- Добавляет рекорд игрока в «3 в ряд» (сколько этапов пройдено максимум).
alter table public.users
  add column if not exists best_match3 integer not null default 0;

notify pgrst, 'reload schema';

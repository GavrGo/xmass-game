-- ВЫПОЛНИТЬ ОДИН РАЗ в Supabase → SQL Editor (если база уже создана).
-- Добавляет колонку с личным рекордом игрока в Ksuha Run.
alter table public.users
  add column if not exists best_ksuha_run integer not null default 0;

-- Просим Supabase сразу «увидеть» новую колонку (лечит ошибку "Could not find the column ... in the schema cache")
notify pgrst, 'reload schema';

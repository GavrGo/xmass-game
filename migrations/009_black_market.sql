-- ВЫПОЛНИТЬ ОДИН РАЗ в Supabase → SQL Editor (после 008).
-- Купленные артефакты чёрного рынка хранятся списком ключей у игрока (например {x100,wild}).
alter table public.users add column if not exists artifacts text[] not null default '{}';

NOTIFY pgrst, 'reload schema';

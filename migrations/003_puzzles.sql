-- ВЫПОЛНИТЬ ОДИН РАЗ в Supabase → SQL Editor.
-- Добавляет счётчик собранных пазлов (для таблицы «кто собрал больше всех» в Пятнашках).
alter table public.users
  add column if not exists puzzles_solved integer not null default 0;

notify pgrst, 'reload schema';

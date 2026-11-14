-- ВЫПОЛНИТЬ ОДИН РАЗ в Supabase → SQL Editor.
-- Добавляет рекорд игрока в Babka Crash (максимум пройденных дорог).
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS best_babka_crash integer DEFAULT 0;

NOTIFY pgrst, 'reload schema';

-- ВЫПОЛНИТЬ ОДИН РАЗ в Supabase → SQL Editor.
-- Добавляет рекорд игрока в Jira Fight (лучший пройденный уровень).
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS best_jira_level integer DEFAULT 0;

NOTIFY pgrst, 'reload schema';

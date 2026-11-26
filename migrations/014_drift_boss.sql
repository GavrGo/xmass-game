-- ВЫПОЛНИТЬ ОДИН РАЗ в Supabase → SQL Editor.
-- Рекорд в Drift Boss (очки за забег) и уведомления о смене глобального рекорда.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS best_drift_boss integer DEFAULT 0;

create trigger record_holder_drift before update of best_drift_boss on public.users
  for each row execute function public.record_holder_change('best_drift_boss');

NOTIFY pgrst, 'reload schema';

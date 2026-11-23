-- ВЫПОЛНИТЬ ОДИН РАЗ в Supabase → SQL Editor (после 011), ДО деплоя.
-- Прокачка «Договоримся»: снижает курс обмена фишек на билеты.
alter table public.users add column if not exists exchange_level integer not null default 0;

NOTIFY pgrst, 'reload schema';

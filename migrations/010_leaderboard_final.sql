-- ВЫПОЛНИТЬ ОДИН РАЗ в Supabase → SQL Editor (после 009).
-- Фиксирует победителя лидерборда: первый, кто спросит после дедлайна, «замораживает» лидера по хэпэшкам,
-- дальше все видят одного и того же победителя, даже если игроки продолжают играть.
create table if not exists public.leaderboard_final (
  final_at    timestamptz primary key,          -- дедлайн из config.ts (ЛИДЕРБОРД.финал)
  telegram_id bigint,
  nickname    text not null,
  emoji       text not null,
  hearts      integer not null,
  frozen_at   timestamptz not null default now()
);
alter table public.leaderboard_final enable row level security;
drop policy if exists "final read" on public.leaderboard_final;
create policy "final read" on public.leaderboard_final for select to anon using (true);

create or replace function public.leaderboard_final(p_final timestamptz)
returns public.leaderboard_final language plpgsql security definer as $$
declare r public.leaderboard_final;
begin
  select * into r from public.leaderboard_final where final_at = p_final;
  if found then return r; end if;
  if now() < p_final then return null; end if;
  insert into public.leaderboard_final (final_at, telegram_id, nickname, emoji, hearts)
    select p_final, telegram_id, nickname, emoji, hearts from public.users
    order by hearts desc, created_at asc limit 1
  on conflict (final_at) do nothing;
  select * into r from public.leaderboard_final where final_at = p_final;
  return r;
end $$;

-- НЕОБЯЗАТЕЛЬНО, для точности «на секунду дедлайна»: если включено расширение pg_cron (Database → Extensions),
-- можно заморозить победителя ровно в нужный момент, даже если никто не открывал игру:
--   select cron.schedule('freeze-leaderboard', '0 12 30 12 *', $$ select public.leaderboard_final('2026-12-30 12:00+00') $$);
-- (время cron — по UTC; подставьте свой дедлайн; без этого победитель фиксируется при первом заходе после дедлайна)

NOTIFY pgrst, 'reload schema';

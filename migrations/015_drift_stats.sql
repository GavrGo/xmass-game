-- ВЫПОЛНИТЬ ОДИН РАЗ в Supabase → SQL Editor (после 014).
-- Счётчик запусков Drift Boss в статистике админки.
alter table public.user_stats add column if not exists plays_drift integer not null default 0;

create or replace function public.stat_inc(p_id bigint, p_field text, p_n integer default 1)
returns void language plpgsql security definer as $$
begin
  if p_field not in ('seconds_in_game','slot_spins','wheel_spins','plays_ksuha','plays_match3',
                     'plays_puzzle','plays_jira','plays_babka','plays_blackjack','plays_drift','duels_sent',
                     'wheel_x3','wheel_x5','wheel_x10','wheel_x100','wheel_wins','wheel_losses','slot_bombs') then
    raise exception 'bad stat field';
  end if;
  execute format(
    'insert into public.user_stats (telegram_id, %1$I) values ($1, $2)
     on conflict (telegram_id) do update set %1$I = public.user_stats.%1$I + $2', p_field)
  using p_id, p_n;
end $$;

NOTIFY pgrst, 'reload schema';

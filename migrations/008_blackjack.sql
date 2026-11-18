-- ВЫПОЛНИТЬ ОДИН РАЗ в Supabase → SQL Editor (после 007).
-- Комиссия обмена теперь хранится у игрока (меняется в Black Jack с торговцем); все существующие игроки получают 50%.
alter table public.users add column if not exists exchange_fee integer not null default 50;

-- Статистика: счётчик раздач Black Jack
alter table public.user_stats add column if not exists plays_blackjack integer not null default 0;

create or replace function public.stat_inc(p_id bigint, p_field text, p_n integer default 1)
returns void language plpgsql security definer as $$
begin
  if p_field not in ('seconds_in_game','slot_spins','wheel_spins','plays_ksuha','plays_match3',
                     'plays_puzzle','plays_jira','plays_babka','plays_blackjack','duels_sent') then
    raise exception 'bad stat field';
  end if;
  execute format(
    'insert into public.user_stats (telegram_id, %1$I) values ($1, $2)
     on conflict (telegram_id) do update set %1$I = public.user_stats.%1$I + $2', p_field)
  using p_id, p_n;
end $$;

NOTIFY pgrst, 'reload schema';

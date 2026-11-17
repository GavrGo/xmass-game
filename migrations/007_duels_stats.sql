-- ВЫПОЛНИТЬ ОДИН РАЗ в Supabase → SQL Editor.
-- Статистика игроков + дуэли (камень-ножницы-бумага на хэпэшки).

-- ---------- Статистика ----------
create table if not exists public.user_stats (
  telegram_id     bigint primary key references public.users(telegram_id) on delete cascade,
  seconds_in_game integer not null default 0,
  slot_spins      integer not null default 0,
  wheel_spins     integer not null default 0,
  plays_ksuha     integer not null default 0,
  plays_match3    integer not null default 0,
  plays_puzzle    integer not null default 0,
  plays_jira      integer not null default 0,
  plays_babka     integer not null default 0,
  duels_sent      integer not null default 0
);
alter table public.user_stats enable row level security;
drop policy if exists "dev stats all" on public.user_stats;
create policy "dev stats all" on public.user_stats for all to anon using (true) with check (true);

create or replace function public.stat_inc(p_id bigint, p_field text, p_n integer default 1)
returns void language plpgsql security definer as $$
begin
  if p_field not in ('seconds_in_game','slot_spins','wheel_spins','plays_ksuha','plays_match3',
                     'plays_puzzle','plays_jira','plays_babka','duels_sent') then
    raise exception 'bad stat field';
  end if;
  execute format(
    'insert into public.user_stats (telegram_id, %1$I) values ($1, $2)
     on conflict (telegram_id) do update set %1$I = public.user_stats.%1$I + $2', p_field)
  using p_id, p_n;
end $$;

-- ---------- Дуэли ----------
create table if not exists public.duels (
  id              uuid primary key default gen_random_uuid(),
  challenger_id   bigint not null,
  target_id       bigint not null,
  bet             integer not null check (bet > 0),
  challenger_pick text not null check (challenger_pick in ('rock','scissors','paper')),
  target_pick     text check (target_pick in ('rock','scissors','paper')),
  status          text not null default 'pending',  -- pending | declined | expired | finished
  winner_id       bigint,                           -- null = ничья
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default now() + interval '24 hours',
  finished_at     timestamptz
);
alter table public.duels enable row level security;
drop policy if exists "dev duels all" on public.duels;
create policy "dev duels all" on public.duels for all to anon using (true) with check (true);
alter publication supabase_realtime add table public.duels;

-- Создать дуэль: ставка сразу списывается у вызвавшего
create or replace function public.duel_create(p_challenger bigint, p_target bigint, p_pick text, p_bet integer)
returns public.duels language plpgsql security definer as $$
declare d public.duels;
begin
  if p_challenger = p_target then raise exception 'Нельзя вызвать самого себя'; end if;
  if p_bet < 1 then raise exception 'Ставка должна быть больше нуля'; end if;
  if exists (select 1 from public.duels where status = 'pending' and
      ((challenger_id = p_challenger and target_id = p_target) or (challenger_id = p_target and target_id = p_challenger))) then
    raise exception 'Между вами уже есть активная дуэль';
  end if;
  update public.users set hearts = hearts - p_bet where telegram_id = p_challenger and hearts >= p_bet;
  if not found then raise exception 'Недостаточно хэпэшек'; end if;
  insert into public.duels (challenger_id, target_id, bet, challenger_pick)
    values (p_challenger, p_target, p_bet, p_pick) returning * into d;
  perform public.stat_inc(p_challenger, 'duels_sent', 1);
  return d;
end $$;

-- Отказаться: ставка возвращается вызвавшему
create or replace function public.duel_decline(p_id uuid, p_user bigint)
returns public.duels language plpgsql security definer as $$
declare d public.duels;
begin
  select * into d from public.duels where id = p_id for update;
  if not found or d.status <> 'pending' or d.target_id <> p_user then raise exception 'Вызов уже недоступен'; end if;
  update public.duels set status = 'declined', finished_at = now() where id = p_id returning * into d;
  update public.users set hearts = hearts + d.bet where telegram_id = d.challenger_id;
  return d;
end $$;

-- Принять: у принявшего списывается ставка, результат считается здесь, победитель получает обе ставки
create or replace function public.duel_accept(p_id uuid, p_user bigint, p_pick text)
returns public.duels language plpgsql security definer as $$
declare d public.duels; w bigint;
begin
  select * into d from public.duels where id = p_id for update;
  if not found or d.status <> 'pending' or d.target_id <> p_user or d.expires_at <= now() then
    raise exception 'Вызов уже недоступен';
  end if;
  update public.users set hearts = hearts - d.bet where telegram_id = p_user and hearts >= d.bet;
  if not found then raise exception 'Недостаточно хэпэшек'; end if;
  if d.challenger_pick = p_pick then
    w := null;
    update public.users set hearts = hearts + d.bet where telegram_id in (d.challenger_id, p_user);
  else
    if (d.challenger_pick = 'rock' and p_pick = 'scissors') or (d.challenger_pick = 'scissors' and p_pick = 'paper')
       or (d.challenger_pick = 'paper' and p_pick = 'rock') then w := d.challenger_id; else w := p_user; end if;
    update public.users set hearts = hearts + 2 * d.bet where telegram_id = w;
  end if;
  update public.duels set status = 'finished', target_pick = p_pick, winner_id = w, finished_at = now()
    where id = p_id returning * into d;
  return d;
end $$;

-- Просроченные дуэли (старше 24 часов): помечаем и возвращаем ставки
create or replace function public.duel_expire_due()
returns setof public.duels language plpgsql security definer as $$
declare d public.duels;
begin
  for d in update public.duels set status = 'expired', finished_at = now()
           where status = 'pending' and expires_at <= now() returning * loop
    update public.users set hearts = hearts + d.bet where telegram_id = d.challenger_id;
    return next d;
  end loop;
end $$;

NOTIFY pgrst, 'reload schema';

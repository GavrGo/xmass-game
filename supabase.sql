-- Таблица игроков
create table public.users (
  telegram_id      bigint primary key,
  nickname         text not null,
  emoji            text not null,
  chips            integer not null default 0,
  tickets          integer not null default 0,
  hearts           integer not null default 0,
  free_spin_level  integer not null default 0,
  salary_level     integer not null default 0,
  exchange_level   integer not null default 0,
  time_level       integer not null default 0,
  best_ksuha_run   integer not null default 0,  -- личный рекорд в Ksuha Run
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Таблица админов
create table public.admins (
  telegram_id bigint primary key
);

-- Автообновление updated_at
create or replace function public.set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger users_updated_at before update on public.users
for each row execute function public.set_updated_at();

-- Включаем защиту строк (RLS)
alter table public.users  enable row level security;
alter table public.admins enable row level security;

-- ВРЕМЕННЫЕ политики для разработки: любой с anon-ключом может читать/менять users.
-- Перед запуском в прод их нужно заменить (нужна серверная проверка initData).
create policy "dev users all" on public.users for all to anon using (true) with check (true);
create policy "dev admins read" on public.admins for select to anon using (true);

-- Включаем realtime для таблицы users
alter publication supabase_realtime add table public.users;

-- Добавить себя в админы (подставьте свой telegram_id):
-- insert into public.admins (telegram_id) values (123456789);

-- ВЫПОЛНИТЬ ОДИН РАЗ в Supabase → SQL Editor.

create table if not exists public.record_notices (
  id           bigserial primary key,
  column_key   text not null,
  old_holder   bigint not null,
  old_nick     text not null,
  new_holder   bigint not null,
  new_nick     text not null,
  value        integer not null,
  tg_sent      boolean not null default false,
  seen         boolean not null default false,
  created_at   timestamptz not null default now()
);

alter table public.record_notices enable row level security;
create policy "dev record_notices all" on public.record_notices for all to anon using (true) with check (true);

create or replace function public.record_holder_change() returns trigger language plpgsql as $$
declare
  col text := TG_ARGV[0];
  newval integer := coalesce((to_jsonb(new) ->> col)::integer, 0);
  oldval integer := coalesce((to_jsonb(old) ->> col)::integer, 0);
  prev record;
begin
  if newval <= oldval then return new; end if;
  execute format(
    'select telegram_id, nickname, %I as v from public.users order by %I desc nulls last, created_at asc limit 1',
    col, col
  ) into prev;
  if prev.telegram_id is null or prev.v is null or prev.v <= 0
     or prev.telegram_id = new.telegram_id or newval <= prev.v then
    return new;
  end if;
  insert into public.record_notices (column_key, old_holder, old_nick, new_holder, new_nick, value)
  values (col, prev.telegram_id, prev.nickname, new.telegram_id, new.nickname, newval);
  return new;
end;
$$;

create trigger record_holder_ksuha before update of best_ksuha_run on public.users
  for each row execute function public.record_holder_change('best_ksuha_run');
create trigger record_holder_match3 before update of best_match3 on public.users
  for each row execute function public.record_holder_change('best_match3');
create trigger record_holder_jira before update of best_jira_level on public.users
  for each row execute function public.record_holder_change('best_jira_level');
create trigger record_holder_babka before update of best_babka_crash on public.users
  for each row execute function public.record_holder_change('best_babka_crash');

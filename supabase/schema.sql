-- LOCK IN cloud sync schema. Run once in your Supabase project: SQL Editor -> New query -> Run.
-- Every record (session, note, subject, preset, achievement unlock, settings) is one row.
-- Row-level security means each signed-in account can only ever read or write its own rows.

create table if not exists public.lockin_records (
  user_id    uuid   not null default auth.uid() references auth.users on delete cascade,
  collection text   not null,             -- 'sessions', 'notes', 'subjects', 'presets', 'achievements', 'tasks', 'settings'
  id         text   not null,
  data       jsonb  not null,             -- the record exactly as the app stores it
  updated_at bigint not null,             -- the record's own updatedAt (ms); newest wins
  seq        bigint not null,             -- server-assigned change counter; devices pull "everything after seq N"
  primary key (user_id, collection, id)
);

create sequence if not exists public.lockin_seq;
create index if not exists lockin_records_user_seq on public.lockin_records (user_id, seq);

alter table public.lockin_records enable row level security;

drop policy if exists "Users manage their own records" on public.lockin_records;
create policy "Users manage their own records" on public.lockin_records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Upload a batch. A row only replaces the stored one if it is newer, so devices can't
-- overwrite each other's later edits. Returns how many rows changed.
create or replace function public.lockin_push(rows jsonb) returns integer
language sql security invoker as $$
  with input as (
    select r->>'collection' as collection, r->>'id' as id, r->'data' as data, (r->>'updated_at')::bigint as updated_at
    from jsonb_array_elements(rows) as r
  ), changed as (
    insert into public.lockin_records as t (user_id, collection, id, data, updated_at, seq)
    select auth.uid(), collection, id, data, updated_at, nextval('public.lockin_seq') from input
    on conflict (user_id, collection, id) do update
      set data = excluded.data, updated_at = excluded.updated_at, seq = nextval('public.lockin_seq')
      where t.updated_at < excluded.updated_at
    returning 1
  )
  select count(*)::int from changed;
$$;

grant usage on sequence public.lockin_seq to authenticated;
grant select, insert, update, delete on public.lockin_records to authenticated;
grant execute on function public.lockin_push(jsonb) to authenticated;

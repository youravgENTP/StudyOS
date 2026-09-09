create table if not exists public.habit_definitions (
  id uuid primary key default gen_random_uuid(), user_id text not null default auth.user_id(),
  name text not null check (char_length(trim(name)) between 1 and 100), color text not null default '#6f8f78' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  weekdays smallint[] not null default array[0,1,2,3,4,5,6]::smallint[], archived_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (cardinality(weekdays)>0 and weekdays <@ array[0,1,2,3,4,5,6]::smallint[])
);
create unique index if not exists habit_definitions_active_name_idx on public.habit_definitions(user_id,lower(name)) where archived_at is null;
create table if not exists public.habit_completions (
  id uuid primary key default gen_random_uuid(), user_id text not null default auth.user_id(),
  habit_id uuid not null references public.habit_definitions(id) on delete cascade,
  completion_date date not null, created_at timestamptz not null default now(), unique(user_id,habit_id,completion_date)
);
create index if not exists habit_completions_date_idx on public.habit_completions(user_id,completion_date);
drop trigger if exists habit_definitions_set_updated_at on public.habit_definitions;
create trigger habit_definitions_set_updated_at before update on public.habit_definitions for each row execute function private.set_updated_at();
alter table public.habit_definitions enable row level security; alter table public.habit_definitions force row level security;
alter table public.habit_completions enable row level security; alter table public.habit_completions force row level security;
grant select,insert,update,delete on public.habit_definitions,public.habit_completions to authenticated;
drop policy if exists "habit_definitions_owner" on public.habit_definitions; drop policy if exists "habit_completions_owner" on public.habit_completions;
create policy "habit_definitions_owner" on public.habit_definitions to authenticated using(private.is_studyos_owner() and auth.user_id()=user_id) with check(private.is_studyos_owner() and auth.user_id()=user_id);
create policy "habit_completions_owner" on public.habit_completions to authenticated using(private.is_studyos_owner() and auth.user_id()=user_id) with check(private.is_studyos_owner() and auth.user_id()=user_id);

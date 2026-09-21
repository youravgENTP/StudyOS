create table if not exists public.study_timer_state (
  user_id text primary key default private.current_user_id(),
  started_at timestamptz,
  updated_at timestamptz not null default now()
);

drop trigger if exists study_timer_state_set_updated_at on public.study_timer_state;
create trigger study_timer_state_set_updated_at
before update on public.study_timer_state
for each row execute function private.set_updated_at();

alter table public.study_timer_state enable row level security;
alter table public.study_timer_state force row level security;
grant select, insert, update on public.study_timer_state to authenticated;

drop policy if exists "study_timer_state_owner" on public.study_timer_state;
create policy "study_timer_state_owner" on public.study_timer_state
to authenticated
using (private.is_studyos_owner() and private.current_user_id() = user_id)
with check (private.is_studyos_owner() and private.current_user_id() = user_id);

create or replace function public.start_study_timer(requested_started_at timestamptz default now())
returns timestamptz
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id text := private.current_user_id();
  active_started_at timestamptz;
begin
  if owner_id is null or not private.is_studyos_owner() then
    raise exception 'Not authorized';
  end if;
  if requested_started_at > now() then
    raise exception 'Timer cannot start in the future';
  end if;

  insert into public.study_timer_state (user_id, started_at)
  values (owner_id, requested_started_at)
  on conflict (user_id) do update
    set started_at = coalesce(public.study_timer_state.started_at, excluded.started_at)
  returning started_at into active_started_at;

  return active_started_at;
end;
$$;

create or replace function public.pause_study_timer()
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id text := private.current_user_id();
  active_started_at timestamptz;
  stopped_at timestamptz := clock_timestamp();
  elapsed_seconds integer;
begin
  if owner_id is null or not private.is_studyos_owner() then
    raise exception 'Not authorized';
  end if;

  select started_at into active_started_at
  from public.study_timer_state
  where user_id = owner_id
  for update;

  if active_started_at is null then
    return 0;
  end if;

  elapsed_seconds := greatest(1, floor(extract(epoch from (stopped_at - active_started_at)))::integer);

  insert into public.study_sessions (user_id, duration_seconds, started_at, ended_at, source)
  values (owner_id, elapsed_seconds, active_started_at, stopped_at, 'timer');

  update public.study_timer_state
  set started_at = null
  where user_id = owner_id;

  return elapsed_seconds;
end;
$$;

revoke all on function public.start_study_timer(timestamptz) from public;
revoke all on function public.pause_study_timer() from public;
grant execute on function public.start_study_timer(timestamptz) to authenticated;
grant execute on function public.pause_study_timer() to authenticated;

notify pgrst, 'reload schema';

create or replace function public.rollover_study_timer(requested_boundaries timestamptz[])
returns timestamptz
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id text := private.current_user_id();
  active_id uuid;
  active_started_at timestamptz;
  boundary_at timestamptz;
  previous_boundary timestamptz;
  elapsed_seconds integer;
  active_timer_end constant timestamptz := '9999-12-31 23:59:59.999+00'::timestamptz;
begin
  if owner_id is null or not private.is_studyos_owner() then
    raise exception 'Not authorized';
  end if;
  if coalesce(cardinality(requested_boundaries), 0) > 32 then
    raise exception 'At most 32 midnight boundaries may be processed at once';
  end if;

  foreach boundary_at in array coalesce(requested_boundaries, array[]::timestamptz[]) loop
    if boundary_at > clock_timestamp() + interval '5 minutes' then
      raise exception 'Timer boundary cannot be in the future';
    end if;
    if previous_boundary is not null and boundary_at <= previous_boundary then
      raise exception 'Timer boundaries must be strictly increasing';
    end if;
    previous_boundary := boundary_at;
  end loop;

  select id, started_at into active_id, active_started_at
  from public.study_sessions
  where user_id = owner_id and ended_at = active_timer_end
  for update;

  if active_id is null or active_started_at is null then
    return null;
  end if;

  foreach boundary_at in array coalesce(requested_boundaries, array[]::timestamptz[]) loop
    if boundary_at <= active_started_at then
      continue;
    end if;

    elapsed_seconds := greatest(1, floor(extract(epoch from (boundary_at - active_started_at)))::integer);
    update public.study_sessions
    set duration_seconds = elapsed_seconds,
        ended_at = boundary_at - interval '1 microsecond'
    where id = active_id and user_id = owner_id and ended_at = active_timer_end;

    insert into public.study_sessions (user_id, duration_seconds, started_at, ended_at, source)
    values (owner_id, 1, boundary_at, active_timer_end, 'timer')
    returning id, started_at into active_id, active_started_at;
  end loop;

  return active_started_at;
end;
$$;

revoke all on function public.rollover_study_timer(timestamptz[]) from public;
grant execute on function public.rollover_study_timer(timestamptz[]) to authenticated;

notify pgrst, 'reload schema';

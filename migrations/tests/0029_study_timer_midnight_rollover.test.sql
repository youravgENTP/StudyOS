-- Run after loading migration 0029 in a transaction. All test changes are
-- intended to be rolled back by the caller.

select set_config('request.jwt.claims', jsonb_build_object('sub', (select user_id from private.app_owners limit 1))::text, true);

do $$
declare
  owner_id text := auth.user_id();
  active_timer_end constant timestamptz := '9999-12-31 23:59:59.999+00'::timestamptz;
  first_boundary timestamptz := '2020-01-02 00:00:00+09'::timestamptz;
  second_boundary timestamptz := '2020-01-03 00:00:00+09'::timestamptz;
  result timestamptz;
begin
  delete from public.study_sessions where user_id = owner_id and ended_at = active_timer_end;
  insert into public.study_sessions (user_id, duration_seconds, started_at, ended_at, source)
  values (owner_id, 1, '2020-01-01 23:30:00+09', active_timer_end, 'timer');

  result := public.rollover_study_timer(array[first_boundary]);
  if result <> first_boundary then raise exception 'active timer did not restart at midnight'; end if;
  if not exists (
    select 1 from public.study_sessions
    where user_id = owner_id
      and started_at = '2020-01-01 23:30:00+09'::timestamptz
      and ended_at = first_boundary - interval '1 microsecond'
      and duration_seconds = 1800
  ) then raise exception 'pre-midnight duration was not recorded on the previous day'; end if;
  if not exists (
    select 1 from public.study_sessions
    where user_id = owner_id and started_at = first_boundary and ended_at = active_timer_end
  ) then raise exception 'post-midnight active timer was not created'; end if;

  perform public.rollover_study_timer(array[first_boundary]);
  if (select count(*) from public.study_sessions where user_id = owner_id and started_at = first_boundary) <> 1 then
    raise exception 'repeated rollover was not idempotent';
  end if;

  result := public.rollover_study_timer(array[first_boundary, second_boundary]);
  if result <> second_boundary then raise exception 'multiple missed midnights were not processed'; end if;
  if not exists (
    select 1 from public.study_sessions
    where user_id = owner_id and started_at = first_boundary
      and ended_at = second_boundary - interval '1 microsecond'
      and duration_seconds = 86400
  ) then raise exception 'full missed day was not recorded separately'; end if;
end;
$$;

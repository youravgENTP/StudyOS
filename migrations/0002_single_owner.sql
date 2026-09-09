create schema if not exists private;
revoke all on schema private from public, anonymous, authenticated;

create table if not exists private.app_owners (
  user_id text primary key,
  created_at timestamptz not null default now()
);

insert into private.app_owners (user_id)
select id::text from neon_auth."user"
order by "createdAt" asc
limit 1
on conflict (user_id) do nothing;

create or replace function private.is_studyos_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.app_owners
    where user_id = auth.user_id()
  );
$$;

revoke all on function private.is_studyos_owner() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_studyos_owner() to authenticated;

drop policy if exists "study_sessions_select_own" on public.study_sessions;
drop policy if exists "study_sessions_insert_own" on public.study_sessions;
drop policy if exists "study_sessions_update_own" on public.study_sessions;
drop policy if exists "study_sessions_delete_own" on public.study_sessions;

create policy "study_sessions_select_owner" on public.study_sessions
  for select to authenticated
  using (private.is_studyos_owner() and (select auth.user_id()) = user_id);
create policy "study_sessions_insert_owner" on public.study_sessions
  for insert to authenticated
  with check (private.is_studyos_owner() and (select auth.user_id()) = user_id);
create policy "study_sessions_update_owner" on public.study_sessions
  for update to authenticated
  using (private.is_studyos_owner() and (select auth.user_id()) = user_id)
  with check (private.is_studyos_owner() and (select auth.user_id()) = user_id);
create policy "study_sessions_delete_owner" on public.study_sessions
  for delete to authenticated
  using (private.is_studyos_owner() and (select auth.user_id()) = user_id);

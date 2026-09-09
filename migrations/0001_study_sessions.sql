create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default auth.user_id(),
  duration_seconds integer not null check (duration_seconds > 0),
  started_at timestamptz,
  ended_at timestamptz not null default now(),
  source text not null check (source in ('timer', 'manual')),
  created_at timestamptz not null default now(),
  check (started_at is null or started_at <= ended_at)
);
create index if not exists study_sessions_user_ended_at_idx on public.study_sessions (user_id, ended_at desc);
alter table public.study_sessions enable row level security;
alter table public.study_sessions force row level security;
grant select, insert, update, delete on public.study_sessions to authenticated;
drop policy if exists "study_sessions_select_own" on public.study_sessions;
drop policy if exists "study_sessions_insert_own" on public.study_sessions;
drop policy if exists "study_sessions_update_own" on public.study_sessions;
drop policy if exists "study_sessions_delete_own" on public.study_sessions;
create policy "study_sessions_select_own" on public.study_sessions for select to authenticated using ((select auth.user_id()) = user_id);
create policy "study_sessions_insert_own" on public.study_sessions for insert to authenticated with check ((select auth.user_id()) = user_id);
create policy "study_sessions_update_own" on public.study_sessions for update to authenticated using ((select auth.user_id()) = user_id) with check ((select auth.user_id()) = user_id);
create policy "study_sessions_delete_own" on public.study_sessions for delete to authenticated using ((select auth.user_id()) = user_id);

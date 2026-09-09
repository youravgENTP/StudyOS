create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default auth.user_id(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  color text not null default '#7185a6' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists subjects_user_name_active_idx
  on public.subjects (user_id, lower(name)) where archived_at is null;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default auth.user_id(),
  title text not null check (char_length(trim(title)) between 1 and 240),
  category text not null check (category in ('study','personal','errands','development','other')),
  subject_id uuid references public.subjects(id) on delete restrict,
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (category = 'study' or subject_id is null)
);

create index if not exists tasks_user_due_date_idx on public.tasks (user_id, due_date);
create index if not exists tasks_user_completed_idx on public.tasks (user_id, completed_at);

create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists subjects_set_updated_at on public.subjects;
create trigger subjects_set_updated_at before update on public.subjects
  for each row execute function private.set_updated_at();
drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at before update on public.tasks
  for each row execute function private.set_updated_at();

alter table public.subjects enable row level security;
alter table public.subjects force row level security;
alter table public.tasks enable row level security;
alter table public.tasks force row level security;
grant select, insert, update, delete on public.subjects, public.tasks to authenticated;

drop policy if exists "subjects_select_owner" on public.subjects;
drop policy if exists "subjects_insert_owner" on public.subjects;
drop policy if exists "subjects_update_owner" on public.subjects;
drop policy if exists "subjects_delete_owner" on public.subjects;
drop policy if exists "tasks_select_owner" on public.tasks;
drop policy if exists "tasks_insert_owner" on public.tasks;
drop policy if exists "tasks_update_owner" on public.tasks;
drop policy if exists "tasks_delete_owner" on public.tasks;

create policy "subjects_select_owner" on public.subjects for select to authenticated using (private.is_studyos_owner() and auth.user_id() = user_id);
create policy "subjects_insert_owner" on public.subjects for insert to authenticated with check (private.is_studyos_owner() and auth.user_id() = user_id);
create policy "subjects_update_owner" on public.subjects for update to authenticated using (private.is_studyos_owner() and auth.user_id() = user_id) with check (private.is_studyos_owner() and auth.user_id() = user_id);
create policy "subjects_delete_owner" on public.subjects for delete to authenticated using (private.is_studyos_owner() and auth.user_id() = user_id);
create policy "tasks_select_owner" on public.tasks for select to authenticated using (private.is_studyos_owner() and auth.user_id() = user_id);
create policy "tasks_insert_owner" on public.tasks for insert to authenticated with check (private.is_studyos_owner() and auth.user_id() = user_id);
create policy "tasks_update_owner" on public.tasks for update to authenticated using (private.is_studyos_owner() and auth.user_id() = user_id) with check (private.is_studyos_owner() and auth.user_id() = user_id);
create policy "tasks_delete_owner" on public.tasks for delete to authenticated using (private.is_studyos_owner() and auth.user_id() = user_id);

-- Project -> Workstream -> Section -> Task and value-based habit tracking.
-- Existing tasks intentionally keep section_id = null and appear as Ungrouped.

create table public.sections (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default private.current_user_id(),
  workstream_id uuid not null references public.workstreams(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 240),
  description text check (description is null or char_length(description) <= 4000),
  start_date date,
  due_date date,
  status text not null default 'not_started' check (status in ('not_started','in_progress','done','dropped')),
  position integer not null default 0 check (position >= 0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sections_date_order check (start_date is null or due_date is null or start_date <= due_date),
  constraint sections_id_workstream_unique unique (id, workstream_id)
);

alter table public.tasks add column section_id uuid;
alter table public.tasks add constraint tasks_section_workstream_match
  foreign key (section_id, workstream_id) references public.sections(id, workstream_id);

create index sections_workstream_position_idx on public.sections (workstream_id, position) where archived_at is null;
create index tasks_section_position_idx on public.tasks (section_id, position);
drop trigger if exists sections_set_updated_at on public.sections;
create trigger sections_set_updated_at before update on public.sections for each row execute function private.set_updated_at();
alter table public.sections enable row level security;
alter table public.sections force row level security;
grant select, insert, update, delete on public.sections to authenticated;
create policy "sections_owner" on public.sections to authenticated
  using (private.is_studyos_owner() and private.current_user_id() = user_id)
  with check (private.is_studyos_owner() and private.current_user_id() = user_id);

alter table public.habit_definitions
  add column tracking_mode text not null default 'binary'
  check (tracking_mode in ('binary','counter'));

create table public.habit_daily_records (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default private.current_user_id(),
  habit_id uuid not null references public.habit_definitions(id) on delete cascade,
  record_date date not null,
  value integer not null default 0 check (value >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, habit_id, record_date)
);

insert into public.habit_daily_records (user_id, habit_id, record_date, value, created_at)
select user_id, habit_id, completion_date, 1, created_at from public.habit_completions
on conflict (user_id, habit_id, record_date) do update set value = greatest(public.habit_daily_records.value, 1);

create index habit_daily_records_date_idx on public.habit_daily_records(user_id, record_date);
drop trigger if exists habit_daily_records_set_updated_at on public.habit_daily_records;
create trigger habit_daily_records_set_updated_at before update on public.habit_daily_records for each row execute function private.set_updated_at();
alter table public.habit_daily_records enable row level security;
alter table public.habit_daily_records force row level security;
grant select, insert, update, delete on public.habit_daily_records to authenticated;
create policy "habit_daily_records_owner" on public.habit_daily_records to authenticated
  using (private.is_studyos_owner() and private.current_user_id() = user_id)
  with check (private.is_studyos_owner() and private.current_user_id() = user_id);

notify pgrst, 'reload schema';

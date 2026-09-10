-- Tasks becomes Project -> optional Workstream -> Task.
-- Production had no task rows when this migration was authored. The backfill
-- remains defensive: each owner with legacy tasks receives one Legacy Tasks
-- project; subject-linked tasks receive a matching subject workstream. A legacy
-- null due_date inherits that legacy parent deadline, whose documented fallback
-- is current_date when the owner has no dated task. No start date is invented.

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default private.current_user_id(),
  title text not null check (char_length(trim(title)) between 1 and 240),
  category text not null check (category in ('study','personal','errands','development','other')),
  description text check (description is null or char_length(description) <= 4000),
  start_date date,
  due_date date not null,
  status text not null default 'not_started' check (status in ('not_started','in_progress','done','dropped')),
  is_dday boolean not null default false,
  position integer not null default 0 check (position >= 0),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_date_order check (start_date is null or start_date <= due_date),
  constraint projects_done_timestamp check ((status = 'done') = (completed_at is not null))
);

create table public.workstreams (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default private.current_user_id(),
  project_id uuid not null references public.projects(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete restrict,
  title text not null check (char_length(trim(title)) between 1 and 240),
  category text not null check (category in ('study','personal','errands','development','other')),
  description text check (description is null or char_length(description) <= 4000),
  start_date date,
  due_date date not null,
  status text not null default 'not_started' check (status in ('not_started','in_progress','done','dropped')),
  is_dday boolean not null default false,
  position integer not null default 0 check (position >= 0),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workstreams_date_order check (start_date is null or start_date <= due_date),
  constraint workstreams_done_timestamp check ((status = 'done') = (completed_at is not null))
);

alter table public.tasks
  add column project_id uuid references public.projects(id) on delete cascade,
  add column workstream_id uuid references public.workstreams(id) on delete cascade,
  add column description text check (description is null or char_length(description) <= 4000),
  add column start_date date,
  add column status text default 'not_started',
  add column position integer default 0;

insert into public.projects (user_id, title, category, due_date, status, position)
select user_id, 'Legacy Tasks', 'other', coalesce(max(due_date), current_date), 'in_progress', 0
from public.tasks
group by user_id;

insert into public.workstreams (user_id, project_id, subject_id, title, category, due_date, status, position)
select t.user_id, p.id, t.subject_id, s.name, 'study', coalesce(max(t.due_date), p.due_date), 'in_progress',
       (row_number() over (partition by t.user_id order by lower(s.name)) - 1)::integer
from public.tasks t
join public.projects p on p.user_id = t.user_id and p.title = 'Legacy Tasks'
join public.subjects s on s.id = t.subject_id
where t.subject_id is not null
group by t.user_id, p.id, p.due_date, t.subject_id, s.name;

update public.tasks t
set project_id = p.id,
    workstream_id = (select w.id from public.workstreams w where w.project_id = p.id and w.subject_id = t.subject_id),
    due_date = coalesce(t.due_date, (select w.due_date from public.workstreams w where w.project_id = p.id and w.subject_id = t.subject_id), p.due_date),
    status = case when t.completed_at is null then 'not_started' else 'done' end
from public.projects p
where p.user_id = t.user_id and p.title = 'Legacy Tasks';

with positioned as (
  select id, row_number() over (partition by project_id, workstream_id order by created_at, id) - 1 as next_position
  from public.tasks
)
update public.tasks t set position = positioned.next_position::integer from positioned where positioned.id = t.id;

alter table public.workstreams add constraint workstreams_id_project_unique unique (id, project_id);

alter table public.tasks
  drop column subject_id,
  alter column project_id set not null,
  alter column due_date set not null,
  alter column status set not null,
  alter column position set not null,
  add constraint tasks_status_check check (status in ('not_started','in_progress','done','dropped')),
  add constraint tasks_position_check check (position >= 0),
  add constraint tasks_date_order check (start_date is null or start_date <= due_date),
  add constraint tasks_done_timestamp check ((status = 'done') = (completed_at is not null)),
  add constraint tasks_workstream_project_match foreign key (workstream_id, project_id)
    references public.workstreams(id, project_id);

create index projects_user_position_idx on public.projects (user_id, position);
create index projects_user_due_date_idx on public.projects (user_id, due_date);
create index workstreams_project_position_idx on public.workstreams (project_id, position);
create index workstreams_user_due_date_idx on public.workstreams (user_id, due_date);
create index tasks_project_workstream_position_idx on public.tasks (project_id, workstream_id, position);
create index tasks_user_status_idx on public.tasks (user_id, status);

drop trigger if exists projects_set_updated_at on public.projects;
drop trigger if exists workstreams_set_updated_at on public.workstreams;
create trigger projects_set_updated_at before update on public.projects for each row execute function private.set_updated_at();
create trigger workstreams_set_updated_at before update on public.workstreams for each row execute function private.set_updated_at();

alter table public.projects enable row level security;
alter table public.projects force row level security;
alter table public.workstreams enable row level security;
alter table public.workstreams force row level security;
grant select, insert, update, delete on public.projects, public.workstreams to authenticated;

create policy "projects_owner" on public.projects to authenticated
  using (private.is_studyos_owner() and private.current_user_id() = user_id)
  with check (private.is_studyos_owner() and private.current_user_id() = user_id);
create policy "workstreams_owner" on public.workstreams to authenticated
  using (private.is_studyos_owner() and private.current_user_id() = user_id)
  with check (private.is_studyos_owner() and private.current_user_id() = user_id);

alter table public.tasks alter column user_id set default private.current_user_id();
drop policy if exists "tasks_select_owner" on public.tasks;
drop policy if exists "tasks_insert_owner" on public.tasks;
drop policy if exists "tasks_update_owner" on public.tasks;
drop policy if exists "tasks_delete_owner" on public.tasks;
create policy "tasks_owner" on public.tasks to authenticated
  using (private.is_studyos_owner() and private.current_user_id() = user_id)
  with check (private.is_studyos_owner() and private.current_user_id() = user_id);

notify pgrst, 'reload schema';

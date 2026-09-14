create table public.study_timetables (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default private.current_user_id(),
  source_app text not null,
  source_timetable_id text not null,
  name text not null check (char_length(trim(name)) between 1 and 120),
  academic_year integer not null check (academic_year between 2000 and 2100),
  academic_term text not null check (academic_term in ('1', 'summer', '2', 'winter')),
  exported_at timestamptz not null,
  total_weekly_minutes integer not null default 0 check (total_weekly_minutes >= 0),
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, academic_year, academic_term)
);

create table public.study_timetable_courses (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default private.current_user_id(),
  timetable_id uuid not null references public.study_timetables(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  external_lecture_id bigint not null,
  course_code text not null,
  section text not null,
  professor text,
  credits numeric(4, 1),
  weekly_minutes integer not null default 0 check (weekly_minutes >= 0),
  unique (timetable_id, external_lecture_id)
);

create table public.study_class_meetings (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default private.current_user_id(),
  course_id uuid not null references public.study_timetable_courses(id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  start_minute smallint not null check (start_minute between 0 and 1439),
  end_minute smallint not null check (end_minute between 1 and 1440),
  location text not null default '',
  check (end_minute > start_minute),
  unique (course_id, weekday, start_minute, end_minute)
);

create index study_timetables_user_term_idx
  on public.study_timetables(user_id, academic_year desc, academic_term desc);
create index study_timetable_courses_timetable_idx
  on public.study_timetable_courses(timetable_id);
create index study_class_meetings_course_weekday_idx
  on public.study_class_meetings(course_id, weekday, start_minute);

create trigger study_timetables_set_updated_at
before update on public.study_timetables
for each row execute function private.set_updated_at();

alter table public.study_timetables enable row level security;
alter table public.study_timetables force row level security;
alter table public.study_timetable_courses enable row level security;
alter table public.study_timetable_courses force row level security;
alter table public.study_class_meetings enable row level security;
alter table public.study_class_meetings force row level security;

grant select, insert, update, delete
on public.study_timetables, public.study_timetable_courses, public.study_class_meetings
to authenticated;

create policy "study_timetables_owner" on public.study_timetables
to authenticated using (private.is_studyos_owner() and private.current_user_id() = user_id)
with check (private.is_studyos_owner() and private.current_user_id() = user_id);
create policy "study_timetable_courses_owner" on public.study_timetable_courses
to authenticated using (private.is_studyos_owner() and private.current_user_id() = user_id)
with check (private.is_studyos_owner() and private.current_user_id() = user_id);
create policy "study_class_meetings_owner" on public.study_class_meetings
to authenticated using (private.is_studyos_owner() and private.current_user_id() = user_id)
with check (private.is_studyos_owner() and private.current_user_id() = user_id);

create or replace function public.import_studyos_timetable(payload jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  owner_id text := private.current_user_id();
  imported_timetable_id uuid;
  subject_id uuid;
  course_id uuid;
  subject_item jsonb;
  meeting_item jsonb;
  course_minutes integer;
  calculated_total integer := 0;
  course_position integer := 0;
  palette text[] := array['#719ce3', '#a88bd8', '#6eae91', '#d4a15c', '#ca7f93', '#68a9b7', '#9d8bd8', '#bf8b67'];
begin
  if not private.is_studyos_owner() or owner_id is null then
    raise exception 'Not authorized';
  end if;
  if payload->>'format' <> 'studyos-timetable' or (payload->>'version')::integer <> 1 then
    raise exception 'Unsupported timetable format';
  end if;
  if coalesce(jsonb_typeof(payload->'subjects'), '') <> 'array' then
    raise exception 'Invalid subjects';
  end if;
  if jsonb_array_length(payload->'subjects') = 0 or jsonb_array_length(payload->'subjects') > 100 then
    raise exception 'Invalid subjects';
  end if;

  insert into public.study_timetables (
    user_id, source_app, source_timetable_id, name, academic_year,
    academic_term, exported_at, total_weekly_minutes, imported_at
  ) values (
    owner_id, payload->'source'->>'app', payload->'source'->>'timetableId',
    payload->'source'->>'timetableName', (payload->>'academicYear')::integer,
    payload->>'academicTerm', (payload->>'exportedAt')::timestamptz, 0, now()
  )
  on conflict (user_id, academic_year, academic_term) do update set
    source_app = excluded.source_app,
    source_timetable_id = excluded.source_timetable_id,
    name = excluded.name,
    exported_at = excluded.exported_at,
    total_weekly_minutes = 0,
    imported_at = now()
  returning id into imported_timetable_id;

  delete from public.study_timetable_courses
  where timetable_id = imported_timetable_id;

  for subject_item in select value from jsonb_array_elements(payload->'subjects') loop
    course_position := course_position + 1;
    if coalesce(trim(subject_item->>'name'), '') = ''
      or jsonb_typeof(subject_item->'meetings') <> 'array'
      or jsonb_array_length(subject_item->'meetings') > 20 then
      raise exception 'Invalid subject at position %', course_position;
    end if;

    select id into subject_id
    from public.subjects
    where user_id = owner_id
      and academic_year = (payload->>'academicYear')::integer
      and academic_term = payload->>'academicTerm'
      and lower(name) = lower(subject_item->>'name')
      and archived_at is null
    limit 1;

    if subject_id is null then
      insert into public.subjects(user_id, name, color, academic_year, academic_term)
      values (
        owner_id, trim(subject_item->>'name'),
        palette[((course_position - 1) % array_length(palette, 1)) + 1],
        (payload->>'academicYear')::integer, payload->>'academicTerm'
      ) returning id into subject_id;
    end if;

    insert into public.study_timetable_courses (
      user_id, timetable_id, subject_id, external_lecture_id, course_code,
      section, professor, credits, weekly_minutes
    ) values (
      owner_id, imported_timetable_id, subject_id, (subject_item->>'externalLectureId')::bigint,
      coalesce(subject_item->>'courseCode', ''), coalesce(subject_item->>'section', ''),
      nullif(trim(subject_item->>'professor'), ''), (subject_item->>'credits')::numeric, 0
    ) returning id into course_id;

    course_minutes := 0;
    for meeting_item in select value from jsonb_array_elements(subject_item->'meetings') loop
      insert into public.study_class_meetings (
        user_id, course_id, weekday, start_minute, end_minute, location
      ) values (
        owner_id, course_id, (meeting_item->>'weekday')::smallint,
        (meeting_item->>'startMinute')::smallint, (meeting_item->>'endMinute')::smallint,
        coalesce(meeting_item->>'location', '')
      );
      course_minutes := course_minutes
        + (meeting_item->>'endMinute')::integer
        - (meeting_item->>'startMinute')::integer;
    end loop;

    update public.study_timetable_courses
    set weekly_minutes = course_minutes
    where id = course_id;
    calculated_total := calculated_total + course_minutes;
    subject_id := null;
  end loop;

  update public.study_timetables
  set total_weekly_minutes = calculated_total
  where id = imported_timetable_id;

  return imported_timetable_id;
end;
$$;

revoke all on function public.import_studyos_timetable(jsonb) from public;
grant execute on function public.import_studyos_timetable(jsonb) to authenticated;

notify pgrst, 'reload schema';

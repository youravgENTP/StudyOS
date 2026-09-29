-- Versioned GPT-friendly Tasks/Schedules interchange. Existing rows are reused
-- by their normalized name and parent path; imports only add missing rows.

create or replace function public.import_studyos_plan(payload jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  owner_id text := private.current_user_id();
  subject_item jsonb; subcategory_item jsonb; project_item jsonb; workstream_item jsonb;
  section_item jsonb; task_item jsonb; event_item jsonb;
  target_subject_id uuid; target_subcategory_id uuid; target_project_id uuid; target_workstream_id uuid; target_section_id uuid;
  inserted_subjects integer := 0; inserted_subcategories integer := 0; inserted_projects integer := 0;
  inserted_workstreams integer := 0; inserted_sections integer := 0; inserted_tasks integer := 0; inserted_events integer := 0;
  item_status text; item_category text; all_day boolean;
begin
  if payload->>'format' <> 'studyos-plan' or (payload->>'version')::integer <> 1 then
    raise exception 'Unsupported StudyOS plan format';
  end if;
  if jsonb_typeof(payload->'catalog'->'subjects') <> 'array'
     or jsonb_typeof(payload->'catalog'->'scheduleSubcategories') <> 'array'
     or jsonb_typeof(payload->'tasks'->'projects') <> 'array'
     or jsonb_typeof(payload->'schedules'->'events') <> 'array' then
    raise exception 'Invalid StudyOS plan structure';
  end if;
  if jsonb_array_length(payload->'catalog'->'subjects') > 500
     or jsonb_array_length(payload->'catalog'->'scheduleSubcategories') > 500
     or jsonb_array_length(payload->'tasks'->'projects') > 2000
     or jsonb_array_length(payload->'schedules'->'events') > 10000 then
    raise exception 'StudyOS plan is too large';
  end if;

  for subject_item in select value from jsonb_array_elements(payload->'catalog'->'subjects') loop
    target_subject_id := null;
    select s.id into target_subject_id from public.subjects s
      where s.user_id = owner_id and s.archived_at is null and lower(s.name) = lower(trim(subject_item->>'name'))
        and s.academic_year = (subject_item->>'academicYear')::integer and s.academic_term = subject_item->>'academicTerm' limit 1;
    if target_subject_id is null then
      insert into public.subjects (user_id, name, color, academic_year, academic_term)
      values (owner_id, trim(subject_item->>'name'), subject_item->>'color', (subject_item->>'academicYear')::integer, subject_item->>'academicTerm')
      returning id into target_subject_id;
      inserted_subjects := inserted_subjects + 1;
    end if;
  end loop;

  for subcategory_item in select value from jsonb_array_elements(payload->'catalog'->'scheduleSubcategories') loop
    item_category := subcategory_item->>'category';
    target_subcategory_id := null;
    select sc.id into target_subcategory_id from public.schedule_subcategories sc
      where sc.user_id = owner_id and sc.archived_at is null and sc.category = item_category
        and lower(sc.name) = lower(trim(subcategory_item->>'name')) limit 1;
    if target_subcategory_id is null then
      insert into public.schedule_subcategories (user_id, category, name, color, position)
      values (owner_id, item_category, trim(subcategory_item->>'name'), subcategory_item->>'color', coalesce((subcategory_item->>'position')::integer, 0))
      returning id into target_subcategory_id;
      inserted_subcategories := inserted_subcategories + 1;
    end if;
  end loop;

  for project_item in select value from jsonb_array_elements(payload->'tasks'->'projects') loop
    target_project_id := null;
    select p.id into target_project_id from public.projects p
      where p.user_id = owner_id and lower(p.title) = lower(trim(project_item->>'title')) order by p.position, p.created_at limit 1;
    if target_project_id is null then
      item_status := coalesce(project_item->>'status', 'not_started');
      insert into public.projects (user_id, title, description, category, start_date, due_date, status, is_dday, position, completed_at)
      values (owner_id, trim(project_item->>'title'), nullif(trim(project_item->>'description'), ''), project_item->>'category', nullif(project_item->>'startDate', '')::date,
        (project_item->>'dueDate')::date, item_status, coalesce((project_item->>'isDday')::boolean, false), coalesce((project_item->>'position')::integer, 0), case when item_status = 'done' then now() end)
      returning id into target_project_id;
      inserted_projects := inserted_projects + 1;
    end if;

    for workstream_item in select value from jsonb_array_elements(coalesce(project_item->'workstreams', '[]'::jsonb)) loop
      target_workstream_id := null;
      select w.id into target_workstream_id from public.workstreams w
        where w.user_id = owner_id and w.project_id = target_project_id and lower(w.title) = lower(trim(workstream_item->>'title')) order by w.position, w.created_at limit 1;
      if target_workstream_id is null then
        target_subject_id := null;
        if nullif(trim(workstream_item->>'subject'), '') is not null then
          select s.id into target_subject_id from public.subjects s
          where s.user_id = owner_id and s.archived_at is null and (
            s.id::text = workstream_item->>'subject' or exists (
              select 1 from jsonb_array_elements(payload->'catalog'->'subjects') catalog_subject
              where (catalog_subject->>'id' = workstream_item->>'subject' or lower(catalog_subject->>'name') = lower(trim(workstream_item->>'subject')))
                and lower(s.name) = lower(catalog_subject->>'name') and s.academic_year = (catalog_subject->>'academicYear')::integer and s.academic_term = catalog_subject->>'academicTerm'
            ) or lower(s.name) = lower(trim(workstream_item->>'subject'))
          ) order by (s.id::text = workstream_item->>'subject') desc, s.created_at desc limit 1;
          if target_subject_id is null then raise exception 'Unknown Subject: %', workstream_item->>'subject'; end if;
        end if;
        item_status := coalesce(workstream_item->>'status', 'not_started');
        insert into public.workstreams (user_id, project_id, subject_id, title, description, category, start_date, due_date, status, is_dday, show_on_calendar, position, completed_at)
        values (owner_id, target_project_id, target_subject_id, trim(workstream_item->>'title'), nullif(trim(workstream_item->>'description'), ''), workstream_item->>'category', nullif(workstream_item->>'startDate', '')::date,
          (workstream_item->>'dueDate')::date, item_status, coalesce((workstream_item->>'isDday')::boolean, false), coalesce((workstream_item->>'showOnCalendar')::boolean, true), coalesce((workstream_item->>'position')::integer, 0), case when item_status = 'done' then now() end)
        returning id into target_workstream_id;
        inserted_workstreams := inserted_workstreams + 1;
      end if;

      for section_item in select value from jsonb_array_elements(coalesce(workstream_item->'sections', '[]'::jsonb)) loop
        target_section_id := null;
        select s.id into target_section_id from public.sections s
          where s.user_id = owner_id and s.workstream_id = target_workstream_id and s.archived_at is null and lower(s.title) = lower(trim(section_item->>'title')) order by s.position, s.created_at limit 1;
        if target_section_id is null then
          insert into public.sections (user_id, workstream_id, title, description, start_date, due_date, status, position)
          values (owner_id, target_workstream_id, trim(section_item->>'title'), nullif(trim(section_item->>'description'), ''), nullif(section_item->>'startDate', '')::date,
            nullif(section_item->>'dueDate', '')::date, coalesce(section_item->>'status', 'not_started'), coalesce((section_item->>'position')::integer, 0))
          returning id into target_section_id;
          inserted_sections := inserted_sections + 1;
        end if;
        for task_item in select value from jsonb_array_elements(coalesce(section_item->'tasks', '[]'::jsonb)) loop
          if not exists (select 1 from public.tasks t where t.user_id = owner_id and t.section_id = target_section_id and lower(t.title) = lower(trim(task_item->>'title')) and t.due_date = (task_item->>'dueDate')::date) then
            item_status := coalesce(task_item->>'status', 'not_started');
            insert into public.tasks (user_id, project_id, workstream_id, section_id, title, description, category, start_date, due_date, status, is_dday, show_on_calendar, is_deadline, position, completed_at)
            values (owner_id, target_project_id, target_workstream_id, target_section_id, trim(task_item->>'title'), nullif(trim(task_item->>'description'), ''), task_item->>'category', nullif(task_item->>'startDate', '')::date,
              (task_item->>'dueDate')::date, item_status, coalesce((task_item->>'isDday')::boolean, false), coalesce((task_item->>'showOnCalendar')::boolean, true), coalesce((task_item->>'isDeadline')::boolean, false), coalesce((task_item->>'position')::integer, 0), case when item_status = 'done' then now() end);
            inserted_tasks := inserted_tasks + 1;
          end if;
        end loop;
      end loop;

      target_section_id := null;
      for task_item in select value from jsonb_array_elements(coalesce(workstream_item->'tasks', '[]'::jsonb)) loop
        if not exists (select 1 from public.tasks t where t.user_id = owner_id and t.workstream_id = target_workstream_id and t.section_id is null and lower(t.title) = lower(trim(task_item->>'title')) and t.due_date = (task_item->>'dueDate')::date) then
          item_status := coalesce(task_item->>'status', 'not_started');
          insert into public.tasks (user_id, project_id, workstream_id, section_id, title, description, category, start_date, due_date, status, is_dday, show_on_calendar, is_deadline, position, completed_at)
          values (owner_id, target_project_id, target_workstream_id, null, trim(task_item->>'title'), nullif(trim(task_item->>'description'), ''), task_item->>'category', nullif(task_item->>'startDate', '')::date,
            (task_item->>'dueDate')::date, item_status, coalesce((task_item->>'isDday')::boolean, false), coalesce((task_item->>'showOnCalendar')::boolean, true), coalesce((task_item->>'isDeadline')::boolean, false), coalesce((task_item->>'position')::integer, 0), case when item_status = 'done' then now() end);
          inserted_tasks := inserted_tasks + 1;
        end if;
      end loop;
    end loop;

    target_workstream_id := null;
    for task_item in select value from jsonb_array_elements(coalesce(project_item->'tasks', '[]'::jsonb)) loop
      if not exists (select 1 from public.tasks t where t.user_id = owner_id and t.project_id = target_project_id and t.workstream_id is null and lower(t.title) = lower(trim(task_item->>'title')) and t.due_date = (task_item->>'dueDate')::date) then
        item_status := coalesce(task_item->>'status', 'not_started');
        insert into public.tasks (user_id, project_id, workstream_id, section_id, title, description, category, start_date, due_date, status, is_dday, show_on_calendar, is_deadline, position, completed_at)
        values (owner_id, target_project_id, null, null, trim(task_item->>'title'), nullif(trim(task_item->>'description'), ''), task_item->>'category', nullif(task_item->>'startDate', '')::date,
          (task_item->>'dueDate')::date, item_status, coalesce((task_item->>'isDday')::boolean, false), coalesce((task_item->>'showOnCalendar')::boolean, true), coalesce((task_item->>'isDeadline')::boolean, false), coalesce((task_item->>'position')::integer, 0), case when item_status = 'done' then now() end);
        inserted_tasks := inserted_tasks + 1;
      end if;
    end loop;
  end loop;

  for event_item in select value from jsonb_array_elements(payload->'schedules'->'events') loop
    item_category := event_item->>'category'; all_day := coalesce((event_item->>'allDay')::boolean, false);
    target_subject_id := null; target_subcategory_id := null;
    if item_category = 'study' and nullif(trim(event_item->>'subject'), '') is not null then
      select s.id into target_subject_id from public.subjects s
      where s.user_id = owner_id and s.archived_at is null and (
        s.id::text = event_item->>'subject' or exists (
          select 1 from jsonb_array_elements(payload->'catalog'->'subjects') catalog_subject
          where (catalog_subject->>'id' = event_item->>'subject' or lower(catalog_subject->>'name') = lower(trim(event_item->>'subject')))
            and lower(s.name) = lower(catalog_subject->>'name') and s.academic_year = (catalog_subject->>'academicYear')::integer and s.academic_term = catalog_subject->>'academicTerm'
        ) or lower(s.name) = lower(trim(event_item->>'subject'))
      ) order by (s.id::text = event_item->>'subject') desc, s.created_at desc limit 1;
      if target_subject_id is null then raise exception 'Unknown Subject: %', event_item->>'subject'; end if;
    end if;
    if nullif(trim(event_item->>'subcategory'), '') is not null then
      select sc.id into target_subcategory_id from public.schedule_subcategories sc where sc.user_id = owner_id and sc.archived_at is null and sc.category = item_category and lower(sc.name) = lower(trim(event_item->>'subcategory')) limit 1;
      if target_subcategory_id is null then raise exception 'Unknown Schedule Subcategory: %', event_item->>'subcategory'; end if;
    end if;
    if not exists (select 1 from public.events e where e.user_id = owner_id and lower(e.title) = lower(trim(event_item->>'title')) and e.start_date = (event_item->>'startDate')::date and e.end_date = (event_item->>'endDate')::date and e.start_time is not distinct from (case when all_day then null else (event_item->>'startTime')::time end) and e.end_time is not distinct from (case when all_day then null else (event_item->>'endTime')::time end)) then
      insert into public.events (user_id, title, category, subject_id, subcategory_id, all_day, start_date, start_time, end_date, end_time, is_major, display_style)
      values (owner_id, trim(event_item->>'title'), item_category, target_subject_id, target_subcategory_id, all_day, (event_item->>'startDate')::date,
        case when all_day then null else (event_item->>'startTime')::time end, (event_item->>'endDate')::date, case when all_day then null else (event_item->>'endTime')::time end,
        coalesce((event_item->>'isMajor')::boolean, false), coalesce(event_item->>'displayStyle', 'compact'));
      inserted_events := inserted_events + 1;
    end if;
  end loop;

  return jsonb_build_object('subjects', inserted_subjects, 'subcategories', inserted_subcategories, 'projects', inserted_projects,
    'workstreams', inserted_workstreams, 'sections', inserted_sections, 'tasks', inserted_tasks, 'events', inserted_events);
end;
$$;

revoke all on function public.import_studyos_plan(jsonb) from public;
grant execute on function public.import_studyos_plan(jsonb) to authenticated;
notify pgrst, 'reload schema';

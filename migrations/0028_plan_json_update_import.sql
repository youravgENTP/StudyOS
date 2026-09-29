-- Adds opt-in update semantics without changing the production v1 merge RPC.
-- Both modes are additive: records omitted from the payload are never deleted.

alter table public.events drop constraint if exists events_subcategory_category_match;
alter table public.events add constraint events_subcategory_category_match
  foreign key (subcategory_id, category) references public.schedule_subcategories(id, category)
  on update cascade on delete set null (subcategory_id);

create or replace function private.increment_plan_import_count(counts jsonb, entity_name text)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_set(counts, array[entity_name], to_jsonb(coalesce((counts->>entity_name)::integer, 0) + 1));
$$;

revoke all on function private.increment_plan_import_count(jsonb, text) from public;
grant execute on function private.increment_plan_import_count(jsonb, text) to authenticated;

create or replace function private.import_studyos_plan_tasks_v2(
  payload jsonb, import_mode text, owner_id text, project_item jsonb, workstream_item jsonb, section_item jsonb,
  target_project_id uuid, target_workstream_id uuid, target_section_id uuid,
  inserted_counts jsonb, updated_counts jsonb, unchanged_counts jsonb
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  task_item jsonb; task_items jsonb; target_task_id uuid; item_status text;
begin
  task_items := case when section_item is not null then coalesce(section_item->'tasks', '[]'::jsonb)
    when workstream_item is not null then coalesce(workstream_item->'tasks', '[]'::jsonb)
    else coalesce(project_item->'tasks', '[]'::jsonb) end;
  for task_item in select value from jsonb_array_elements(task_items) loop
    target_task_id := null;
    if nullif(task_item->>'id', '') is not null then
      select t.id into target_task_id from public.tasks t where t.user_id = owner_id and t.id::text = task_item->>'id' limit 1;
    end if;
    if target_task_id is null then
      if import_mode = 'update' then
        select t.id into target_task_id from public.tasks t
        where t.user_id = owner_id and t.project_id = target_project_id
          and t.workstream_id is not distinct from target_workstream_id and t.section_id is not distinct from target_section_id
          and lower(trim(t.title)) = lower(trim(task_item->>'title')) order by t.position, t.created_at limit 1;
      else
        select t.id into target_task_id from public.tasks t
        where t.user_id = owner_id and t.project_id = target_project_id
          and t.workstream_id is not distinct from target_workstream_id and t.section_id is not distinct from target_section_id
          and lower(trim(t.title)) = lower(trim(task_item->>'title')) and t.due_date = (task_item->>'dueDate')::date
        order by t.position, t.created_at limit 1;
      end if;
    end if;
    item_status := coalesce(task_item->>'status', 'not_started');
    if target_task_id is null then
      insert into public.tasks (user_id, project_id, workstream_id, section_id, title, description, category, start_date, due_date, status, is_dday, show_on_calendar, is_deadline, position, completed_at)
      values (owner_id, target_project_id, target_workstream_id, target_section_id, trim(task_item->>'title'), nullif(trim(task_item->>'description'), ''), task_item->>'category',
        nullif(task_item->>'startDate', '')::date, (task_item->>'dueDate')::date, item_status, coalesce((task_item->>'isDday')::boolean, false),
        coalesce((task_item->>'showOnCalendar')::boolean, true), coalesce((task_item->>'isDeadline')::boolean, false), coalesce((task_item->>'position')::integer, 0),
        case when item_status = 'done' then now() end);
      inserted_counts := private.increment_plan_import_count(inserted_counts, 'tasks');
    elsif import_mode = 'update' then
      update public.tasks t set project_id = target_project_id, workstream_id = target_workstream_id, section_id = target_section_id,
        title = trim(task_item->>'title'), description = nullif(trim(task_item->>'description'), ''), category = task_item->>'category',
        start_date = nullif(task_item->>'startDate', '')::date, due_date = (task_item->>'dueDate')::date, status = item_status,
        is_dday = coalesce((task_item->>'isDday')::boolean, false), show_on_calendar = coalesce((task_item->>'showOnCalendar')::boolean, true),
        is_deadline = coalesce((task_item->>'isDeadline')::boolean, false), position = coalesce((task_item->>'position')::integer, 0),
        completed_at = case when item_status = 'done' then coalesce(t.completed_at, now()) else null end
      where t.id = target_task_id and t.user_id = owner_id and row(t.project_id, t.workstream_id, t.section_id, t.title, t.description, t.category, t.start_date, t.due_date, t.status, t.is_dday, t.show_on_calendar, t.is_deadline, t.position)
        is distinct from row(target_project_id, target_workstream_id, target_section_id, trim(task_item->>'title'), nullif(trim(task_item->>'description'), ''), task_item->>'category',
          nullif(task_item->>'startDate', '')::date, (task_item->>'dueDate')::date, item_status, coalesce((task_item->>'isDday')::boolean, false),
          coalesce((task_item->>'showOnCalendar')::boolean, true), coalesce((task_item->>'isDeadline')::boolean, false), coalesce((task_item->>'position')::integer, 0));
      if found then updated_counts := private.increment_plan_import_count(updated_counts, 'tasks');
      else unchanged_counts := private.increment_plan_import_count(unchanged_counts, 'tasks'); end if;
    else unchanged_counts := private.increment_plan_import_count(unchanged_counts, 'tasks'); end if;
  end loop;
  return jsonb_build_object('inserted', inserted_counts, 'updated', updated_counts, 'unchanged', unchanged_counts);
end;
$$;

revoke all on function private.import_studyos_plan_tasks_v2(jsonb, text, text, jsonb, jsonb, jsonb, uuid, uuid, uuid, jsonb, jsonb, jsonb) from public;
grant execute on function private.import_studyos_plan_tasks_v2(jsonb, text, text, jsonb, jsonb, jsonb, uuid, uuid, uuid, jsonb, jsonb, jsonb) to authenticated;

create or replace function public.import_studyos_plan_v2(payload jsonb, import_mode text)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  owner_id text := private.current_user_id();
  subject_item jsonb; subcategory_item jsonb; project_item jsonb; workstream_item jsonb;
  section_item jsonb; event_item jsonb; catalog_item jsonb;
  target_subject_id uuid; target_subcategory_id uuid; target_project_id uuid;
  target_workstream_id uuid; target_section_id uuid; target_event_id uuid;
  existing_parent_id uuid; existing_category text;
  item_status text; item_category text; item_all_day boolean;
  inserted_counts jsonb := '{"subjects":0,"subcategories":0,"projects":0,"workstreams":0,"sections":0,"tasks":0,"events":0}'::jsonb;
  updated_counts jsonb := '{"subjects":0,"subcategories":0,"projects":0,"workstreams":0,"sections":0,"tasks":0,"events":0}'::jsonb;
  unchanged_counts jsonb := '{"subjects":0,"subcategories":0,"projects":0,"workstreams":0,"sections":0,"tasks":0,"events":0}'::jsonb;
begin
  if not private.is_studyos_owner() or owner_id is null then raise exception 'Not authorized'; end if;
  if import_mode is null or import_mode not in ('merge', 'update') then raise exception 'Unsupported import mode: %', import_mode; end if;
  if coalesce(payload->>'format', '') <> 'studyos-plan' or coalesce(payload->>'version', '') <> '1' then raise exception 'Unsupported StudyOS plan format'; end if;
  if coalesce(jsonb_typeof(payload->'catalog'->'subjects'), '') <> 'array'
     or coalesce(jsonb_typeof(payload->'catalog'->'scheduleSubcategories'), '') <> 'array'
     or coalesce(jsonb_typeof(payload->'tasks'->'projects'), '') <> 'array'
     or coalesce(jsonb_typeof(payload->'schedules'->'events'), '') <> 'array' then raise exception 'Invalid StudyOS plan structure'; end if;
  if jsonb_array_length(payload->'catalog'->'subjects') > 500
     or jsonb_array_length(payload->'catalog'->'scheduleSubcategories') > 500
     or jsonb_array_length(payload->'tasks'->'projects') > 2000
     or jsonb_array_length(payload->'schedules'->'events') > 10000 then raise exception 'StudyOS plan is too large'; end if;

  -- Catalog rows are processed first so descendants can resolve references.
  for subject_item in select value from jsonb_array_elements(payload->'catalog'->'subjects') loop
    target_subject_id := null;
    if nullif(subject_item->>'id', '') is not null then
      select s.id into target_subject_id from public.subjects s where s.user_id = owner_id and s.id::text = subject_item->>'id' limit 1;
    end if;
    if target_subject_id is null then
      select s.id into target_subject_id from public.subjects s
      where s.user_id = owner_id and s.archived_at is null and lower(trim(s.name)) = lower(trim(subject_item->>'name'))
        and s.academic_year = (subject_item->>'academicYear')::integer and s.academic_term = subject_item->>'academicTerm' limit 1;
    end if;
    if target_subject_id is null then
      insert into public.subjects (user_id, name, color, academic_year, academic_term)
      values (owner_id, trim(subject_item->>'name'), subject_item->>'color', (subject_item->>'academicYear')::integer, subject_item->>'academicTerm')
      returning id into target_subject_id;
      inserted_counts := private.increment_plan_import_count(inserted_counts, 'subjects');
    elsif import_mode = 'update' then
      update public.subjects s set name = trim(subject_item->>'name'), color = subject_item->>'color',
        academic_year = (subject_item->>'academicYear')::integer, academic_term = subject_item->>'academicTerm'
      where s.id = target_subject_id and s.user_id = owner_id and row(s.name, s.color, s.academic_year, s.academic_term)
        is distinct from row(trim(subject_item->>'name'), subject_item->>'color', (subject_item->>'academicYear')::integer, subject_item->>'academicTerm');
      if found then updated_counts := private.increment_plan_import_count(updated_counts, 'subjects');
      else unchanged_counts := private.increment_plan_import_count(unchanged_counts, 'subjects'); end if;
    else unchanged_counts := private.increment_plan_import_count(unchanged_counts, 'subjects'); end if;
  end loop;

  for subcategory_item in select value from jsonb_array_elements(payload->'catalog'->'scheduleSubcategories') loop
    item_category := subcategory_item->>'category'; target_subcategory_id := null; existing_category := null;
    if nullif(subcategory_item->>'id', '') is not null then
      select sc.id, sc.category into target_subcategory_id, existing_category from public.schedule_subcategories sc
      where sc.user_id = owner_id and sc.id::text = subcategory_item->>'id' limit 1;
    end if;
    if target_subcategory_id is null then
      select sc.id, sc.category into target_subcategory_id, existing_category from public.schedule_subcategories sc
      where sc.user_id = owner_id and sc.archived_at is null and sc.category = item_category and lower(trim(sc.name)) = lower(trim(subcategory_item->>'name')) limit 1;
    end if;
    if target_subcategory_id is null then
      insert into public.schedule_subcategories (user_id, category, name, color, position)
      values (owner_id, item_category, trim(subcategory_item->>'name'), subcategory_item->>'color', coalesce((subcategory_item->>'position')::integer, 0))
      returning id into target_subcategory_id;
      inserted_counts := private.increment_plan_import_count(inserted_counts, 'subcategories');
    elsif import_mode = 'update' then
      if existing_category is distinct from item_category and item_category <> 'study' then
        update public.events e set subject_id = null where e.user_id = owner_id and e.subcategory_id = target_subcategory_id;
      end if;
      update public.schedule_subcategories sc set category = item_category, name = trim(subcategory_item->>'name'), color = subcategory_item->>'color', position = coalesce((subcategory_item->>'position')::integer, 0)
      where sc.id = target_subcategory_id and sc.user_id = owner_id and row(sc.category, sc.name, sc.color, sc.position)
        is distinct from row(item_category, trim(subcategory_item->>'name'), subcategory_item->>'color', coalesce((subcategory_item->>'position')::integer, 0));
      if found then updated_counts := private.increment_plan_import_count(updated_counts, 'subcategories');
      else unchanged_counts := private.increment_plan_import_count(unchanged_counts, 'subcategories'); end if;
    else unchanged_counts := private.increment_plan_import_count(unchanged_counts, 'subcategories'); end if;
  end loop;

  for project_item in select value from jsonb_array_elements(payload->'tasks'->'projects') loop
    target_project_id := null;
    if nullif(project_item->>'id', '') is not null then
      select p.id into target_project_id from public.projects p where p.user_id = owner_id and p.id::text = project_item->>'id' limit 1;
    end if;
    if target_project_id is null then
      select p.id into target_project_id from public.projects p where p.user_id = owner_id and lower(trim(p.title)) = lower(trim(project_item->>'title')) order by p.position, p.created_at limit 1;
    end if;
    item_status := coalesce(project_item->>'status', 'not_started');
    if target_project_id is null then
      insert into public.projects (user_id, title, description, category, start_date, due_date, status, is_dday, position, completed_at)
      values (owner_id, trim(project_item->>'title'), nullif(trim(project_item->>'description'), ''), project_item->>'category', nullif(project_item->>'startDate', '')::date,
        (project_item->>'dueDate')::date, item_status, coalesce((project_item->>'isDday')::boolean, false), coalesce((project_item->>'position')::integer, 0), case when item_status = 'done' then now() end)
      returning id into target_project_id;
      inserted_counts := private.increment_plan_import_count(inserted_counts, 'projects');
    elsif import_mode = 'update' then
      update public.projects p set title = trim(project_item->>'title'), description = nullif(trim(project_item->>'description'), ''), category = project_item->>'category',
        start_date = nullif(project_item->>'startDate', '')::date, due_date = (project_item->>'dueDate')::date, status = item_status,
        is_dday = coalesce((project_item->>'isDday')::boolean, false), position = coalesce((project_item->>'position')::integer, 0),
        completed_at = case when item_status = 'done' then coalesce(p.completed_at, now()) else null end
      where p.id = target_project_id and p.user_id = owner_id and row(p.title, p.description, p.category, p.start_date, p.due_date, p.status, p.is_dday, p.position)
        is distinct from row(trim(project_item->>'title'), nullif(trim(project_item->>'description'), ''), project_item->>'category', nullif(project_item->>'startDate', '')::date,
          (project_item->>'dueDate')::date, item_status, coalesce((project_item->>'isDday')::boolean, false), coalesce((project_item->>'position')::integer, 0));
      if found then updated_counts := private.increment_plan_import_count(updated_counts, 'projects');
      else unchanged_counts := private.increment_plan_import_count(unchanged_counts, 'projects'); end if;
    else unchanged_counts := private.increment_plan_import_count(unchanged_counts, 'projects'); end if;

    for workstream_item in select value from jsonb_array_elements(coalesce(project_item->'workstreams', '[]'::jsonb)) loop
      target_workstream_id := null; existing_parent_id := null;
      if nullif(workstream_item->>'id', '') is not null then
        select w.id, w.project_id into target_workstream_id, existing_parent_id from public.workstreams w where w.user_id = owner_id and w.id::text = workstream_item->>'id' limit 1;
        if target_workstream_id is not null and existing_parent_id <> target_project_id then raise exception 'Workstream parent does not match its JSON hierarchy: %', workstream_item->>'title'; end if;
      end if;
      if target_workstream_id is null then
        select w.id into target_workstream_id from public.workstreams w where w.user_id = owner_id and w.project_id = target_project_id and lower(trim(w.title)) = lower(trim(workstream_item->>'title')) order by w.position, w.created_at limit 1;
      end if;
      target_subject_id := null;
      if nullif(trim(workstream_item->>'subject'), '') is not null then
        select s.id into target_subject_id from public.subjects s where s.user_id = owner_id and s.archived_at is null and s.id::text = workstream_item->>'subject' limit 1;
        if target_subject_id is null then
          for catalog_item in select value from jsonb_array_elements(payload->'catalog'->'subjects') loop
            if catalog_item->>'id' = workstream_item->>'subject' or lower(trim(catalog_item->>'name')) = lower(trim(workstream_item->>'subject')) then
              select s.id into target_subject_id from public.subjects s where s.user_id = owner_id and s.archived_at is null
                and lower(trim(s.name)) = lower(trim(catalog_item->>'name')) and s.academic_year = (catalog_item->>'academicYear')::integer and s.academic_term = catalog_item->>'academicTerm' limit 1;
              exit when target_subject_id is not null;
            end if;
          end loop;
        end if;
        if target_subject_id is null then raise exception 'Unknown Subject: %', workstream_item->>'subject'; end if;
      end if;
      item_status := coalesce(workstream_item->>'status', 'not_started');
      if target_workstream_id is null then
        insert into public.workstreams (user_id, project_id, subject_id, title, description, category, start_date, due_date, status, is_dday, show_on_calendar, position, completed_at)
        values (owner_id, target_project_id, target_subject_id, trim(workstream_item->>'title'), nullif(trim(workstream_item->>'description'), ''), workstream_item->>'category', nullif(workstream_item->>'startDate', '')::date,
          (workstream_item->>'dueDate')::date, item_status, coalesce((workstream_item->>'isDday')::boolean, false), coalesce((workstream_item->>'showOnCalendar')::boolean, true), coalesce((workstream_item->>'position')::integer, 0), case when item_status = 'done' then now() end)
        returning id into target_workstream_id;
        inserted_counts := private.increment_plan_import_count(inserted_counts, 'workstreams');
      elsif import_mode = 'update' then
        update public.workstreams w set subject_id = target_subject_id, title = trim(workstream_item->>'title'), description = nullif(trim(workstream_item->>'description'), ''), category = workstream_item->>'category',
          start_date = nullif(workstream_item->>'startDate', '')::date, due_date = (workstream_item->>'dueDate')::date, status = item_status,
          is_dday = coalesce((workstream_item->>'isDday')::boolean, false), show_on_calendar = coalesce((workstream_item->>'showOnCalendar')::boolean, true), position = coalesce((workstream_item->>'position')::integer, 0),
          completed_at = case when item_status = 'done' then coalesce(w.completed_at, now()) else null end
        where w.id = target_workstream_id and w.user_id = owner_id and row(w.subject_id, w.title, w.description, w.category, w.start_date, w.due_date, w.status, w.is_dday, w.show_on_calendar, w.position)
          is distinct from row(target_subject_id, trim(workstream_item->>'title'), nullif(trim(workstream_item->>'description'), ''), workstream_item->>'category', nullif(workstream_item->>'startDate', '')::date,
            (workstream_item->>'dueDate')::date, item_status, coalesce((workstream_item->>'isDday')::boolean, false), coalesce((workstream_item->>'showOnCalendar')::boolean, true), coalesce((workstream_item->>'position')::integer, 0));
        if found then updated_counts := private.increment_plan_import_count(updated_counts, 'workstreams');
        else unchanged_counts := private.increment_plan_import_count(unchanged_counts, 'workstreams'); end if;
      else unchanged_counts := private.increment_plan_import_count(unchanged_counts, 'workstreams'); end if;

      for section_item in select value from jsonb_array_elements(coalesce(workstream_item->'sections', '[]'::jsonb)) loop
        target_section_id := null; existing_parent_id := null;
        if nullif(section_item->>'id', '') is not null then
          select s.id, s.workstream_id into target_section_id, existing_parent_id from public.sections s where s.user_id = owner_id and s.id::text = section_item->>'id' limit 1;
          if target_section_id is not null and existing_parent_id <> target_workstream_id then raise exception 'Section parent does not match its JSON hierarchy: %', section_item->>'title'; end if;
        end if;
        if target_section_id is null then
          select s.id into target_section_id from public.sections s where s.user_id = owner_id and s.workstream_id = target_workstream_id and s.archived_at is null and lower(trim(s.title)) = lower(trim(section_item->>'title')) order by s.position, s.created_at limit 1;
        end if;
        if target_section_id is null then
          insert into public.sections (user_id, workstream_id, title, description, start_date, due_date, status, position)
          values (owner_id, target_workstream_id, trim(section_item->>'title'), nullif(trim(section_item->>'description'), ''), nullif(section_item->>'startDate', '')::date,
            nullif(section_item->>'dueDate', '')::date, coalesce(section_item->>'status', 'not_started'), coalesce((section_item->>'position')::integer, 0))
          returning id into target_section_id;
          inserted_counts := private.increment_plan_import_count(inserted_counts, 'sections');
        elsif import_mode = 'update' then
          update public.sections s set title = trim(section_item->>'title'), description = nullif(trim(section_item->>'description'), ''), start_date = nullif(section_item->>'startDate', '')::date,
            due_date = nullif(section_item->>'dueDate', '')::date, status = coalesce(section_item->>'status', 'not_started'), position = coalesce((section_item->>'position')::integer, 0)
          where s.id = target_section_id and s.user_id = owner_id and row(s.title, s.description, s.start_date, s.due_date, s.status, s.position)
            is distinct from row(trim(section_item->>'title'), nullif(trim(section_item->>'description'), ''), nullif(section_item->>'startDate', '')::date,
              nullif(section_item->>'dueDate', '')::date, coalesce(section_item->>'status', 'not_started'), coalesce((section_item->>'position')::integer, 0));
          if found then updated_counts := private.increment_plan_import_count(updated_counts, 'sections');
          else unchanged_counts := private.increment_plan_import_count(unchanged_counts, 'sections'); end if;
        else unchanged_counts := private.increment_plan_import_count(unchanged_counts, 'sections'); end if;
        select r.result->'inserted', r.result->'updated', r.result->'unchanged' into inserted_counts, updated_counts, unchanged_counts
        from private.import_studyos_plan_tasks_v2(payload, import_mode, owner_id, project_item, workstream_item, section_item, target_project_id, target_workstream_id, target_section_id, inserted_counts, updated_counts, unchanged_counts) as r(result);
      end loop;

      select r.result->'inserted', r.result->'updated', r.result->'unchanged' into inserted_counts, updated_counts, unchanged_counts
      from private.import_studyos_plan_tasks_v2(payload, import_mode, owner_id, project_item, workstream_item, null, target_project_id, target_workstream_id, null, inserted_counts, updated_counts, unchanged_counts) as r(result);
    end loop;

    select r.result->'inserted', r.result->'updated', r.result->'unchanged' into inserted_counts, updated_counts, unchanged_counts
    from private.import_studyos_plan_tasks_v2(payload, import_mode, owner_id, project_item, null, null, target_project_id, null, null, inserted_counts, updated_counts, unchanged_counts) as r(result);
  end loop;

  for event_item in select value from jsonb_array_elements(payload->'schedules'->'events') loop
    item_category := event_item->>'category'; item_all_day := coalesce((event_item->>'allDay')::boolean, false);
    target_subject_id := null; target_subcategory_id := null; target_event_id := null;
    if item_category = 'study' and nullif(trim(event_item->>'subject'), '') is not null then
      select s.id into target_subject_id from public.subjects s where s.user_id = owner_id and s.archived_at is null and s.id::text = event_item->>'subject' limit 1;
      if target_subject_id is null then
        for catalog_item in select value from jsonb_array_elements(payload->'catalog'->'subjects') loop
          if catalog_item->>'id' = event_item->>'subject' or lower(trim(catalog_item->>'name')) = lower(trim(event_item->>'subject')) then
            select s.id into target_subject_id from public.subjects s where s.user_id = owner_id and s.archived_at is null and lower(trim(s.name)) = lower(trim(catalog_item->>'name'))
              and s.academic_year = (catalog_item->>'academicYear')::integer and s.academic_term = catalog_item->>'academicTerm' limit 1;
            exit when target_subject_id is not null;
          end if;
        end loop;
      end if;
      if target_subject_id is null then raise exception 'Unknown Subject: %', event_item->>'subject'; end if;
    end if;
    if nullif(trim(event_item->>'subcategory'), '') is not null then
      select sc.id into target_subcategory_id from public.schedule_subcategories sc where sc.user_id = owner_id and sc.archived_at is null and sc.id::text = event_item->>'subcategory' and sc.category = item_category limit 1;
      if target_subcategory_id is null then
        for catalog_item in select value from jsonb_array_elements(payload->'catalog'->'scheduleSubcategories') loop
          if catalog_item->>'id' = event_item->>'subcategory' or lower(trim(catalog_item->>'name')) = lower(trim(event_item->>'subcategory')) then
            select sc.id into target_subcategory_id from public.schedule_subcategories sc where sc.user_id = owner_id and sc.archived_at is null and sc.category = item_category and lower(trim(sc.name)) = lower(trim(catalog_item->>'name')) limit 1;
            exit when target_subcategory_id is not null;
          end if;
        end loop;
      end if;
      if target_subcategory_id is null then
        select sc.id into target_subcategory_id from public.schedule_subcategories sc where sc.user_id = owner_id and sc.archived_at is null and sc.category = item_category and lower(trim(sc.name)) = lower(trim(event_item->>'subcategory')) limit 1;
      end if;
      if target_subcategory_id is null then raise exception 'Unknown Schedule Subcategory: %', event_item->>'subcategory'; end if;
    end if;
    if nullif(event_item->>'id', '') is not null then
      select e.id into target_event_id from public.events e where e.user_id = owner_id and e.id::text = event_item->>'id' limit 1;
    end if;
    if target_event_id is null then
      if import_mode = 'update' then
        select e.id into target_event_id from public.events e where e.user_id = owner_id and lower(trim(e.title)) = lower(trim(event_item->>'title')) and e.category = item_category
          and e.subject_id is not distinct from target_subject_id and e.subcategory_id is not distinct from target_subcategory_id order by e.created_at limit 1;
      else
        select e.id into target_event_id from public.events e where e.user_id = owner_id and lower(trim(e.title)) = lower(trim(event_item->>'title'))
          and e.start_date = (event_item->>'startDate')::date and e.end_date = (event_item->>'endDate')::date
          and e.start_time is not distinct from (case when item_all_day then null else (event_item->>'startTime')::time end)
          and e.end_time is not distinct from (case when item_all_day then null else (event_item->>'endTime')::time end) order by e.created_at limit 1;
      end if;
    end if;
    if target_event_id is null then
      insert into public.events (user_id, title, category, subject_id, subcategory_id, all_day, start_date, start_time, end_date, end_time, is_major, display_style)
      values (owner_id, trim(event_item->>'title'), item_category, target_subject_id, target_subcategory_id, item_all_day, (event_item->>'startDate')::date,
        case when item_all_day then null else (event_item->>'startTime')::time end, (event_item->>'endDate')::date, case when item_all_day then null else (event_item->>'endTime')::time end,
        coalesce((event_item->>'isMajor')::boolean, false), coalesce(event_item->>'displayStyle', 'compact'));
      inserted_counts := private.increment_plan_import_count(inserted_counts, 'events');
    elsif import_mode = 'update' then
      update public.events e set title = trim(event_item->>'title'), category = item_category, subject_id = target_subject_id, subcategory_id = target_subcategory_id,
        all_day = item_all_day, start_date = (event_item->>'startDate')::date, start_time = case when item_all_day then null else (event_item->>'startTime')::time end,
        end_date = (event_item->>'endDate')::date, end_time = case when item_all_day then null else (event_item->>'endTime')::time end,
        is_major = coalesce((event_item->>'isMajor')::boolean, false), display_style = coalesce(event_item->>'displayStyle', 'compact')
      where e.id = target_event_id and e.user_id = owner_id and row(e.title, e.category, e.subject_id, e.subcategory_id, e.all_day, e.start_date, e.start_time, e.end_date, e.end_time, e.is_major, e.display_style)
        is distinct from row(trim(event_item->>'title'), item_category, target_subject_id, target_subcategory_id, item_all_day, (event_item->>'startDate')::date,
          case when item_all_day then null else (event_item->>'startTime')::time end, (event_item->>'endDate')::date, case when item_all_day then null else (event_item->>'endTime')::time end,
          coalesce((event_item->>'isMajor')::boolean, false), coalesce(event_item->>'displayStyle', 'compact'));
      if found then updated_counts := private.increment_plan_import_count(updated_counts, 'events');
      else unchanged_counts := private.increment_plan_import_count(unchanged_counts, 'events'); end if;
    else unchanged_counts := private.increment_plan_import_count(unchanged_counts, 'events'); end if;
  end loop;

  return jsonb_build_object('inserted', inserted_counts, 'updated', updated_counts, 'unchanged', unchanged_counts);
end;
$$;

revoke all on function public.import_studyos_plan_v2(jsonb, text) from public;
grant execute on function public.import_studyos_plan_v2(jsonb, text) to authenticated;
notify pgrst, 'reload schema';

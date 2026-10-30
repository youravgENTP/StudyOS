-- Independent Project archival plus atomic, ownership-scoped Task bulk actions.

alter table public.projects
  add column if not exists archived_at timestamptz;

create index if not exists projects_user_archived_position_idx
  on public.projects (user_id, archived_at, position);

create or replace function public.complete_tasks(task_ids uuid[])
returns integer
language plpgsql
set search_path = ''
as $$
declare
  requested_count integer;
  owned_count integer;
  changed_count integer;
begin
  requested_count := coalesce(cardinality(task_ids), 0);
  if requested_count < 1 or requested_count > 500 then
    raise exception 'Select between 1 and 500 tasks.';
  end if;
  if (select count(distinct id) from unnest(task_ids) as selected(id)) <> requested_count then
    raise exception 'Task IDs must be unique.';
  end if;

  select count(*) into owned_count
  from public.tasks t
  where t.id = any(task_ids) and t.user_id = private.current_user_id();
  if owned_count <> requested_count then
    raise exception 'One or more selected tasks do not exist or are not authorized.';
  end if;

  update public.tasks t
  set status = 'done', completed_at = now()
  where t.id = any(task_ids) and t.user_id = private.current_user_id();
  get diagnostics changed_count = row_count;
  return changed_count;
end;
$$;

create or replace function public.delete_tasks(task_ids uuid[])
returns integer
language plpgsql
set search_path = ''
as $$
declare
  requested_count integer;
  owned_count integer;
  changed_count integer;
begin
  requested_count := coalesce(cardinality(task_ids), 0);
  if requested_count < 1 or requested_count > 500 then
    raise exception 'Select between 1 and 500 tasks.';
  end if;
  if (select count(distinct id) from unnest(task_ids) as selected(id)) <> requested_count then
    raise exception 'Task IDs must be unique.';
  end if;

  select count(*) into owned_count
  from public.tasks t
  where t.id = any(task_ids) and t.user_id = private.current_user_id();
  if owned_count <> requested_count then
    raise exception 'One or more selected tasks do not exist or are not authorized.';
  end if;

  delete from public.tasks t
  where t.id = any(task_ids) and t.user_id = private.current_user_id();
  get diagnostics changed_count = row_count;
  return changed_count;
end;
$$;

-- Wrap the established importer so version 1 files stay valid. The optional
-- archivedAt field is applied only to new Merge records or during Update.
create or replace function public.import_studyos_plan_v3(payload jsonb, import_mode text)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  result jsonb;
  project_item jsonb;
  target_project_id uuid;
  preexisting_project_ids uuid[];
  owner_id text;
begin
  owner_id := private.current_user_id();
  select coalesce(array_agg(p.id), array[]::uuid[]) into preexisting_project_ids
  from public.projects p where p.user_id = owner_id;

  result := public.import_studyos_plan_v2(payload, import_mode);

  for project_item in select value from jsonb_array_elements(payload->'tasks'->'projects') loop
    continue when not (project_item ? 'archivedAt');
    target_project_id := null;
    if nullif(project_item->>'id', '') is not null then
      select p.id into target_project_id from public.projects p
      where p.user_id = owner_id and p.id::text = project_item->>'id' limit 1;
    end if;
    if target_project_id is null then
      select p.id into target_project_id from public.projects p
      where p.user_id = owner_id and lower(trim(p.title)) = lower(trim(project_item->>'title'))
      order by p.position, p.created_at limit 1;
    end if;
    if target_project_id is not null
      and (import_mode = 'update' or not (target_project_id = any(preexisting_project_ids))) then
      update public.projects p
      set archived_at = case when jsonb_typeof(project_item->'archivedAt') = 'null' then null else (project_item->>'archivedAt')::timestamptz end
      where p.id = target_project_id and p.user_id = owner_id;
    end if;
  end loop;
  return result;
end;
$$;

revoke all on function public.complete_tasks(uuid[]) from public;
revoke all on function public.delete_tasks(uuid[]) from public;
revoke all on function public.import_studyos_plan_v3(jsonb, text) from public;
grant execute on function public.complete_tasks(uuid[]) to authenticated;
grant execute on function public.delete_tasks(uuid[]) to authenticated;
grant execute on function public.import_studyos_plan_v3(jsonb, text) to authenticated;

notify pgrst, 'reload schema';

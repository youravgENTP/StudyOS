-- Routine must resolve the JWT user without granting the application role
-- broad USAGE on Neon's protected auth schema.
create or replace function private.current_user_id()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select auth.user_id();
$$;

revoke all on function private.current_user_id() from public;
grant execute on function private.current_user_id() to authenticated;

alter table public.routine_templates alter column user_id set default private.current_user_id();
alter table public.routine_template_items alter column user_id set default private.current_user_id();
alter table public.routine_instances alter column user_id set default private.current_user_id();
alter table public.routine_instance_items alter column user_id set default private.current_user_id();

drop policy if exists "routine_templates_owner" on public.routine_templates;
drop policy if exists "routine_template_items_owner" on public.routine_template_items;
drop policy if exists "routine_instances_owner" on public.routine_instances;
drop policy if exists "routine_instance_items_owner" on public.routine_instance_items;

create policy "routine_templates_owner" on public.routine_templates to authenticated
  using (private.is_studyos_owner() and private.current_user_id() = user_id)
  with check (private.is_studyos_owner() and private.current_user_id() = user_id);
create policy "routine_template_items_owner" on public.routine_template_items to authenticated
  using (private.is_studyos_owner() and private.current_user_id() = user_id)
  with check (private.is_studyos_owner() and private.current_user_id() = user_id);
create policy "routine_instances_owner" on public.routine_instances to authenticated
  using (private.is_studyos_owner() and private.current_user_id() = user_id)
  with check (private.is_studyos_owner() and private.current_user_id() = user_id);
create policy "routine_instance_items_owner" on public.routine_instance_items to authenticated
  using (private.is_studyos_owner() and private.current_user_id() = user_id)
  with check (private.is_studyos_owner() and private.current_user_id() = user_id);

create or replace function public.ensure_routine_instance(target_date date)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id text := private.current_user_id();
  template uuid;
  instance uuid;
  created_instance boolean := false;
begin
  if owner_id is null or not private.is_studyos_owner() then
    raise exception 'Not authorized';
  end if;

  insert into public.routine_templates (user_id, weekday)
    values (owner_id, extract(isodow from target_date)::smallint - 1)
    on conflict (user_id, weekday) do nothing;

  select id into template
  from public.routine_templates
  where user_id = owner_id
    and weekday = extract(isodow from target_date)::smallint - 1;

  insert into public.routine_instances (user_id, routine_date, source_template_id)
    values (owner_id, target_date, template)
    on conflict (user_id, routine_date) do nothing
    returning id into instance;

  if instance is not null then
    created_instance := true;
  else
    select id into instance
    from public.routine_instances
    where user_id = owner_id and routine_date = target_date;
  end if;

  -- Snapshot exactly once. Later template edits must never backfill or mutate an
  -- already-created day, including a day whose template was initially empty.
  if created_instance then
    insert into public.routine_instance_items (
      user_id, instance_id, source_item_id, position, scheduled_time, title, details
    )
      select owner_id, instance, id, position, scheduled_time, title, details
      from public.routine_template_items
      where template_id = template
      order by position;
  end if;

  return instance;
end;
$$;

revoke all on function public.ensure_routine_instance(date) from public;
grant execute on function public.ensure_routine_instance(date) to authenticated;

notify pgrst, 'reload schema';

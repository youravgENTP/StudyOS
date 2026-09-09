create table if not exists public.routine_templates (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default auth.user_id(),
  weekday smallint not null check (weekday between 0 and 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, weekday)
);

create table if not exists public.routine_template_items (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default auth.user_id(),
  template_id uuid not null references public.routine_templates(id) on delete cascade,
  position integer not null default 0 check (position >= 0),
  scheduled_time time,
  title text not null check (char_length(trim(title)) between 1 and 160),
  details text check (details is null or char_length(details) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.routine_instances (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default auth.user_id(),
  routine_date date not null,
  source_template_id uuid references public.routine_templates(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, routine_date)
);

create table if not exists public.routine_instance_items (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default auth.user_id(),
  instance_id uuid not null references public.routine_instances(id) on delete cascade,
  source_item_id uuid references public.routine_template_items(id) on delete set null,
  position integer not null default 0 check (position >= 0),
  scheduled_time time,
  title text not null check (char_length(trim(title)) between 1 and 160),
  details text check (details is null or char_length(details) <= 1000),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists routine_template_items_order_idx on public.routine_template_items (template_id, position);
create index if not exists routine_instance_items_order_idx on public.routine_instance_items (instance_id, position);

drop trigger if exists routine_templates_set_updated_at on public.routine_templates;
drop trigger if exists routine_template_items_set_updated_at on public.routine_template_items;
drop trigger if exists routine_instances_set_updated_at on public.routine_instances;
drop trigger if exists routine_instance_items_set_updated_at on public.routine_instance_items;
create trigger routine_templates_set_updated_at before update on public.routine_templates for each row execute function private.set_updated_at();
create trigger routine_template_items_set_updated_at before update on public.routine_template_items for each row execute function private.set_updated_at();
create trigger routine_instances_set_updated_at before update on public.routine_instances for each row execute function private.set_updated_at();
create trigger routine_instance_items_set_updated_at before update on public.routine_instance_items for each row execute function private.set_updated_at();

alter table public.routine_templates enable row level security;
alter table public.routine_templates force row level security;
alter table public.routine_template_items enable row level security;
alter table public.routine_template_items force row level security;
alter table public.routine_instances enable row level security;
alter table public.routine_instances force row level security;
alter table public.routine_instance_items enable row level security;
alter table public.routine_instance_items force row level security;

grant select, insert, update, delete on public.routine_templates, public.routine_template_items, public.routine_instances, public.routine_instance_items to authenticated;

drop policy if exists "routine_templates_owner" on public.routine_templates;
drop policy if exists "routine_template_items_owner" on public.routine_template_items;
drop policy if exists "routine_instances_owner" on public.routine_instances;
drop policy if exists "routine_instance_items_owner" on public.routine_instance_items;
create policy "routine_templates_owner" on public.routine_templates to authenticated using (private.is_studyos_owner() and auth.user_id() = user_id) with check (private.is_studyos_owner() and auth.user_id() = user_id);
create policy "routine_template_items_owner" on public.routine_template_items to authenticated using (private.is_studyos_owner() and auth.user_id() = user_id) with check (private.is_studyos_owner() and auth.user_id() = user_id);
create policy "routine_instances_owner" on public.routine_instances to authenticated using (private.is_studyos_owner() and auth.user_id() = user_id) with check (private.is_studyos_owner() and auth.user_id() = user_id);
create policy "routine_instance_items_owner" on public.routine_instance_items to authenticated using (private.is_studyos_owner() and auth.user_id() = user_id) with check (private.is_studyos_owner() and auth.user_id() = user_id);

create or replace function public.ensure_routine_instance(target_date date)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  owner_id text := auth.user_id();
  template uuid;
  instance uuid;
  created_instance boolean := false;
begin
  if owner_id is null or not private.is_studyos_owner() then raise exception 'Not authorized'; end if;
  insert into public.routine_templates (user_id, weekday)
    values (owner_id, extract(isodow from target_date)::smallint - 1)
    on conflict (user_id, weekday) do nothing;
  select id into template from public.routine_templates where user_id = owner_id and weekday = extract(isodow from target_date)::smallint - 1;
  insert into public.routine_instances (user_id, routine_date, source_template_id)
    values (owner_id, target_date, template)
    on conflict (user_id, routine_date) do nothing returning id into instance;
  if instance is not null then
    created_instance := true;
  else
    select id into instance from public.routine_instances where user_id = owner_id and routine_date = target_date;
  end if;
  if created_instance or (target_date >= current_date and not exists (select 1 from public.routine_instance_items where instance_id = instance)) then
    insert into public.routine_instance_items (user_id, instance_id, source_item_id, position, scheduled_time, title, details)
      select owner_id, instance, id, position, scheduled_time, title, details
      from public.routine_template_items where template_id = template order by position;
  end if;
  return instance;
end;
$$;

revoke all on function public.ensure_routine_instance(date) from public;
grant execute on function public.ensure_routine_instance(date) to authenticated;
notify pgrst, 'reload schema';

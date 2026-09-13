create table public.schedule_subcategories (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default auth.user_id(),
  category text not null check (category in ('study','personal','errands','development','other')),
  name text not null check (char_length(trim(name)) between 1 and 80),
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  position integer not null default 0 check (position >= 0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category, name),
  unique (id, category)
);

alter table public.events
  add column subcategory_id uuid,
  add constraint events_subcategory_category_match foreign key (subcategory_id, category)
    references public.schedule_subcategories(id, category) on delete set null (subcategory_id);

create index schedule_subcategories_user_category_position_idx on public.schedule_subcategories(user_id, category, position);
create index events_subcategory_idx on public.events(subcategory_id);
create trigger schedule_subcategories_set_updated_at before update on public.schedule_subcategories for each row execute function private.set_updated_at();
alter table public.schedule_subcategories enable row level security;
alter table public.schedule_subcategories force row level security;
grant select,insert,update,delete on public.schedule_subcategories to authenticated;
create policy "schedule_subcategories_owner" on public.schedule_subcategories to authenticated
  using(private.is_studyos_owner() and auth.user_id()=user_id)
  with check(private.is_studyos_owner() and auth.user_id()=user_id);

notify pgrst, 'reload schema';

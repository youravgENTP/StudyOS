create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default auth.user_id(),
  title text not null check (char_length(trim(title)) between 1 and 240),
  category text not null check (
    category in ('study', 'personal', 'errands', 'development', 'other')
  ),
  subject_id uuid references public.subjects(id) on delete restrict,
  all_day boolean not null default false,
  start_date date not null,
  start_time time,
  end_date date not null,
  end_time time,
  is_major boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (
    category = 'study'
    or subject_id is null
  ),

  check (
    (
      all_day = true
      and start_time is null
      and end_time is null
    )
    or
    (
      all_day = false
      and start_time is not null
      and end_time is not null
    )
  ),

  check (
    end_date > start_date
    or (
      end_date = start_date
      and (
        all_day = true
        or end_time > start_time
      )
    )
  )
);

create index if not exists events_user_date_idx
  on public.events (user_id, start_date, end_date);

create index if not exists events_user_major_idx
  on public.events (user_id, is_major)
  where is_major = true;

drop trigger if exists events_set_updated_at on public.events;

create trigger events_set_updated_at
before update on public.events
for each row
execute function private.set_updated_at();

alter table public.events enable row level security;
alter table public.events force row level security;

grant select, insert, update, delete
on public.events
to authenticated;

drop policy if exists "events_select_owner" on public.events;
drop policy if exists "events_insert_owner" on public.events;
drop policy if exists "events_update_owner" on public.events;
drop policy if exists "events_delete_owner" on public.events;

create policy "events_select_owner"
on public.events
for select
to authenticated
using (
  private.is_studyos_owner()
  and auth.user_id() = user_id
);

create policy "events_insert_owner"
on public.events
for insert
to authenticated
with check (
  private.is_studyos_owner()
  and auth.user_id() = user_id
);

create policy "events_update_owner"
on public.events
for update
to authenticated
using (
  private.is_studyos_owner()
  and auth.user_id() = user_id
)
with check (
  private.is_studyos_owner()
  and auth.user_id() = user_id
);

create policy "events_delete_owner"
on public.events
for delete
to authenticated
using (
  private.is_studyos_owner()
  and auth.user_id() = user_id
);

notify pgrst, 'reload schema';
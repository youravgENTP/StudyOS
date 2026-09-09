create table if not exists public.caffeine_intakes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default auth.user_id(),
  source text not null check (char_length(trim(source)) between 1 and 100),
  caffeine_mg numeric(7,2) not null check (caffeine_mg > 0 and caffeine_mg <= 1000),
  started_at timestamptz not null,
  duration_minutes integer not null default 60 check (duration_minutes between 1 and 240),
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists caffeine_intakes_user_started_idx on public.caffeine_intakes(user_id,started_at desc);
drop trigger if exists caffeine_intakes_set_updated_at on public.caffeine_intakes;
create trigger caffeine_intakes_set_updated_at before update on public.caffeine_intakes for each row execute function private.set_updated_at();
alter table public.caffeine_intakes enable row level security;
alter table public.caffeine_intakes force row level security;
grant select,insert,update,delete on public.caffeine_intakes to authenticated;
drop policy if exists "caffeine_intakes_owner" on public.caffeine_intakes;
create policy "caffeine_intakes_owner" on public.caffeine_intakes to authenticated
  using(private.is_studyos_owner() and auth.user_id()=user_id)
  with check(private.is_studyos_owner() and auth.user_id()=user_id);

create table if not exists public.caffeine_presets (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default auth.user_id(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  caffeine_mg numeric(7,2) not null check (caffeine_mg > 0 and caffeine_mg <= 1000),
  kind text not null check (kind in ('drink','tablet')),
  duration_minutes integer not null check (duration_minutes between 1 and 240),
  color text not null default '#d99b43' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,name)
);
drop trigger if exists caffeine_presets_set_updated_at on public.caffeine_presets;
create trigger caffeine_presets_set_updated_at before update on public.caffeine_presets for each row execute function private.set_updated_at();
alter table public.caffeine_presets enable row level security;
alter table public.caffeine_presets force row level security;
grant select,insert,update,delete on public.caffeine_presets to authenticated;
drop policy if exists "caffeine_presets_owner" on public.caffeine_presets;
create policy "caffeine_presets_owner" on public.caffeine_presets to authenticated
  using(private.is_studyos_owner() and auth.user_id()=user_id)
  with check(private.is_studyos_owner() and auth.user_id()=user_id);

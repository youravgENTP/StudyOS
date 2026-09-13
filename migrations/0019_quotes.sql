create table if not exists public.quote_categories (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default auth.user_id(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  color text not null default '#719ce3' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  dashboard_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default auth.user_id(),
  category_id uuid references public.quote_categories(id) on delete set null,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  author text check (author is null or char_length(trim(author)) between 1 and 160),
  source text check (source is null or char_length(trim(source)) between 1 and 240),
  is_active boolean not null default true,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quote_categories_user_idx on public.quote_categories(user_id, name);
create index if not exists quotes_user_category_idx on public.quotes(user_id, category_id, created_at desc);

drop trigger if exists quote_categories_set_updated_at on public.quote_categories;
create trigger quote_categories_set_updated_at before update on public.quote_categories for each row execute function private.set_updated_at();
drop trigger if exists quotes_set_updated_at on public.quotes;
create trigger quotes_set_updated_at before update on public.quotes for each row execute function private.set_updated_at();

alter table public.quote_categories enable row level security;
alter table public.quote_categories force row level security;
alter table public.quotes enable row level security;
alter table public.quotes force row level security;
grant select,insert,update,delete on public.quote_categories,public.quotes to authenticated;

create policy "quote_categories_owner" on public.quote_categories to authenticated
  using(private.is_studyos_owner() and auth.user_id()=user_id)
  with check(private.is_studyos_owner() and auth.user_id()=user_id);
create policy "quotes_owner" on public.quotes to authenticated
  using(private.is_studyos_owner() and auth.user_id()=user_id)
  with check(private.is_studyos_owner() and auth.user_id()=user_id);

notify pgrst, 'reload schema';

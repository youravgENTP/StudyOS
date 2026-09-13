alter table public.caffeine_presets
  add column built_in_key text,
  add column hidden boolean not null default false;

create unique index caffeine_presets_user_built_in_key_unique
  on public.caffeine_presets (user_id, built_in_key)
  where built_in_key is not null;

notify pgrst, 'reload schema';

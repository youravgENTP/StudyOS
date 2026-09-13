alter table public.tasks
  add column is_deadline boolean not null default false;

notify pgrst, 'reload schema';

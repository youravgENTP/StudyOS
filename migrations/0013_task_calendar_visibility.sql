alter table public.tasks
  add column show_on_calendar boolean not null default true;

notify pgrst, 'reload schema';

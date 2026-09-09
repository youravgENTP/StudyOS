alter table public.tasks
  add column if not exists is_dday boolean not null default false;

alter table public.tasks
  add constraint tasks_dday_requires_due_date
  check (not is_dday or due_date is not null);

notify pgrst, 'reload schema';
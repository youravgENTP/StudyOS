alter table public.tasks
  add column if not exists is_dday boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tasks_dday_requires_due_date'
  ) then
    alter table public.tasks
      add constraint tasks_dday_requires_due_date
      check (not is_dday or due_date is not null);
  end if;
end
$$;

notify pgrst, 'reload schema';
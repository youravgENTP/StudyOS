alter table public.subjects
  add column if not exists academic_year integer not null default 2026,
  add column if not exists academic_term text not null default '2';

alter table public.subjects
  drop constraint if exists subjects_academic_year_check,
  add constraint subjects_academic_year_check check (academic_year between 2000 and 2100),
  drop constraint if exists subjects_academic_term_check,
  add constraint subjects_academic_term_check check (academic_term in ('1', 'summer', '2', 'winter'));

-- Subjects created before terms existed belong to the current 2026 fall semester.
update public.subjects
set academic_year = 2026, academic_term = '2'
where academic_year is null or academic_term is null;

drop index if exists public.subjects_user_name_active_idx;
create unique index if not exists subjects_user_term_name_active_idx
  on public.subjects (user_id, academic_year, academic_term, lower(name))
  where archived_at is null;

notify pgrst, 'reload schema';

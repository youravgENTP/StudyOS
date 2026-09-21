create unique index if not exists study_sessions_one_active_timer_per_user_idx
on public.study_sessions (user_id)
where ended_at = '9999-12-31 23:59:59.999+00'::timestamptz;

notify pgrst, 'reload schema';

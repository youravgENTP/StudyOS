alter table public.events
  add column if not exists display_style text not null default 'compact';

alter table public.events
  drop constraint if exists events_display_style_check,
  add constraint events_display_style_check check (display_style in ('compact', 'bar'));

notify pgrst, 'reload schema';

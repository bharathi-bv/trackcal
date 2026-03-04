alter table if exists public.availability_schedules
  add column if not exists blocked_dates jsonb not null default '[]'::jsonb,
  add column if not exists blocked_weekdays integer[] not null default '{}'::integer[];

alter table if exists public.event_types
  add column if not exists blocked_weekdays integer[] not null default '{}'::integer[];

update public.availability_schedules
set
  blocked_dates = coalesce(blocked_dates, '[]'::jsonb),
  blocked_weekdays = coalesce(blocked_weekdays, '{}'::integer[]);

update public.event_types
set
  blocked_dates = coalesce(blocked_dates, '[]'::jsonb),
  blocked_weekdays = coalesce(blocked_weekdays, '{}'::integer[]);

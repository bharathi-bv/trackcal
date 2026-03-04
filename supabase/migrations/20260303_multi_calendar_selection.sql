alter table if exists public.host_settings
  add column if not exists google_calendar_ids text[] not null default '{}'::text[],
  add column if not exists microsoft_calendar_ids text[] not null default '{}'::text[];

alter table if exists public.team_members
  add column if not exists google_calendar_ids text[] not null default '{}'::text[],
  add column if not exists microsoft_calendar_ids text[] not null default '{}'::text[];

update public.host_settings
set
  google_calendar_ids = coalesce(google_calendar_ids, '{}'::text[]),
  microsoft_calendar_ids = coalesce(microsoft_calendar_ids, '{}'::text[]);

update public.team_members
set
  google_calendar_ids = coalesce(google_calendar_ids, '{}'::text[]),
  microsoft_calendar_ids = coalesce(microsoft_calendar_ids, '{}'::text[]);

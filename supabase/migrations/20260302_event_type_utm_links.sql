alter table if exists public.event_types
  add column if not exists utm_links jsonb not null default '[]'::jsonb;

update public.event_types
set utm_links = '[]'::jsonb
where utm_links is null;

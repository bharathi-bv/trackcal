-- Tracking configuration for Integrations2:
-- - custom script URLs for direct booking links
-- - shared event alias map for direct + embed events
-- - optional embed pageview event toggle

alter table if exists public.host_settings
  add column if not exists booking_link_script_urls text[] not null default '{}',
  add column if not exists event_aliases jsonb not null default '{}'::jsonb,
  add column if not exists embed_send_pageview boolean not null default false;

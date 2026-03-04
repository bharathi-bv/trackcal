alter table if exists public.host_settings
  add column if not exists google_analytics_id text,
  add column if not exists google_tag_manager_id text;

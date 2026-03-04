-- Host webhook settings for server-side booking events.
-- Safe to run multiple times.

alter table if exists public.host_settings
  add column if not exists webhook_urls text[] not null default '{}';

-- Host Outlook calendar connection support.
-- Safe to run multiple times.

alter table if exists public.host_settings
  add column if not exists microsoft_access_token text,
  add column if not exists microsoft_refresh_token text,
  add column if not exists microsoft_token_expiry text,
  add column if not exists calendar_provider text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'host_settings_calendar_provider_check'
  ) then
    alter table public.host_settings
      add constraint host_settings_calendar_provider_check
      check (calendar_provider is null or calendar_provider in ('google', 'microsoft'));
  end if;
end
$$;

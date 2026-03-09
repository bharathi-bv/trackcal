-- Track verification state for custom booking subdomain/base URL.

alter table if exists public.host_settings
  add column if not exists booking_base_url_verified boolean not null default false,
  add column if not exists booking_base_url_verified_at timestamptz,
  add column if not exists booking_base_url_last_checked_at timestamptz,
  add column if not exists booking_base_url_check_status text not null default 'unchecked',
  add column if not exists booking_base_url_check_error text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'host_settings_booking_base_url_check_status_check'
  ) then
    alter table public.host_settings
      add constraint host_settings_booking_base_url_check_status_check
      check (booking_base_url_check_status in ('unchecked', 'verified', 'failed'));
  end if;
end $$;

-- Optional custom booking domain/base URL for links and embeds.

alter table if exists public.host_settings
  add column if not exists booking_base_url text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'host_settings_booking_base_url_check'
  ) then
    alter table public.host_settings
      add constraint host_settings_booking_base_url_check
      check (
        booking_base_url is null
        or booking_base_url ~ '^https?://'
      );
  end if;
end $$;

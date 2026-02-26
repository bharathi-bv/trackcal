-- Advanced event type configuration + booking capacity support

alter table if exists public.event_types
  add column if not exists title_template text,
  add column if not exists location_type text not null default 'google_meet',
  add column if not exists location_value text,
  add column if not exists min_notice_hours integer not null default 0,
  add column if not exists max_days_in_advance integer not null default 60,
  add column if not exists booking_window_type text not null default 'rolling',
  add column if not exists booking_window_start_date date,
  add column if not exists booking_window_end_date date,
  add column if not exists buffer_before_minutes integer not null default 0,
  add column if not exists buffer_after_minutes integer not null default 0,
  add column if not exists max_bookings_per_day integer,
  add column if not exists max_bookings_per_slot integer,
  add column if not exists weekly_availability jsonb not null default '{
    "0":{"enabled":false,"start_hour":9,"end_hour":17},
    "1":{"enabled":true,"start_hour":9,"end_hour":17},
    "2":{"enabled":true,"start_hour":9,"end_hour":17},
    "3":{"enabled":true,"start_hour":9,"end_hour":17},
    "4":{"enabled":true,"start_hour":9,"end_hour":17},
    "5":{"enabled":true,"start_hour":9,"end_hour":17},
    "6":{"enabled":false,"start_hour":9,"end_hour":17}
  }'::jsonb,
  add column if not exists blocked_dates text[] not null default '{}';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'event_types_location_type_check') then
    alter table public.event_types
      add constraint event_types_location_type_check
      check (location_type in ('google_meet', 'zoom', 'phone', 'custom', 'none'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'event_types_booking_window_type_check') then
    alter table public.event_types
      add constraint event_types_booking_window_type_check
      check (booking_window_type in ('rolling', 'fixed'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'event_types_booking_window_dates_check') then
    alter table public.event_types
      add constraint event_types_booking_window_dates_check
      check (
        booking_window_type = 'rolling'
        or (
          booking_window_start_date is not null
          and booking_window_end_date is not null
          and booking_window_start_date <= booking_window_end_date
        )
      );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'event_types_hours_check') then
    alter table public.event_types
      add constraint event_types_hours_check
      check (start_hour >= 0 and start_hour <= 23 and end_hour >= 1 and end_hour <= 24 and start_hour < end_hour);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'event_types_slot_increment_check') then
    alter table public.event_types
      add constraint event_types_slot_increment_check
      check (slot_increment in (15, 30, 60));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'event_types_duration_check') then
    alter table public.event_types
      add constraint event_types_duration_check
      check (duration >= 5 and duration <= 480);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'event_types_notice_check') then
    alter table public.event_types
      add constraint event_types_notice_check
      check (min_notice_hours >= 0 and min_notice_hours <= 720);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'event_types_window_check') then
    alter table public.event_types
      add constraint event_types_window_check
      check (max_days_in_advance >= 1 and max_days_in_advance <= 365);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'event_types_buffer_before_check') then
    alter table public.event_types
      add constraint event_types_buffer_before_check
      check (buffer_before_minutes >= 0 and buffer_before_minutes <= 240);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'event_types_buffer_after_check') then
    alter table public.event_types
      add constraint event_types_buffer_after_check
      check (buffer_after_minutes >= 0 and buffer_after_minutes <= 240);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'event_types_max_per_day_check') then
    alter table public.event_types
      add constraint event_types_max_per_day_check
      check (max_bookings_per_day is null or max_bookings_per_day >= 1);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'event_types_max_per_slot_check') then
    alter table public.event_types
      add constraint event_types_max_per_slot_check
      check (max_bookings_per_slot is null or max_bookings_per_slot >= 1);
  end if;
end
$$;

create unique index if not exists event_types_slug_unique_idx
  on public.event_types (slug);

alter table if exists public.bookings
  add column if not exists event_slug text;

create index if not exists bookings_date_event_slug_status_idx
  on public.bookings (date, event_slug, status);

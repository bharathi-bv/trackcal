-- Booking abuse controls and telemetry columns.
-- Safe to run multiple times.

alter table if exists public.bookings
  add column if not exists source_ip text;

alter table if exists public.bookings
  add column if not exists user_agent text;

create index if not exists bookings_source_ip_created_at_idx
  on public.bookings (source_ip, created_at desc)
  where source_ip is not null;

create index if not exists bookings_email_created_at_idx
  on public.bookings (email, created_at desc);

create index if not exists bookings_email_date_time_idx
  on public.bookings (email, date, time);

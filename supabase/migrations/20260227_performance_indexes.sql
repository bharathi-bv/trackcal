-- Performance indexes for dashboard + analytics query paths
-- Safe to run multiple times.

create index if not exists bookings_status_date_time_idx
  on public.bookings (status, date, time);

create index if not exists bookings_status_event_slug_date_idx
  on public.bookings (status, event_slug, date);

create index if not exists bookings_created_at_idx
  on public.bookings (created_at desc);

create index if not exists event_types_is_active_created_at_idx
  on public.event_types (is_active, created_at);

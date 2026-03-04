-- Attendee self-serve booking management (reschedule/cancel links)
-- Safe to run multiple times.

alter table if exists public.bookings
  add column if not exists manage_token_hash text;

alter table if exists public.bookings
  add column if not exists manage_token_expires_at timestamptz;

alter table if exists public.bookings
  add column if not exists calendar_event_id text;

create unique index if not exists bookings_manage_token_hash_unique_idx
  on public.bookings (manage_token_hash)
  where manage_token_hash is not null;

create index if not exists bookings_manage_token_expires_at_idx
  on public.bookings (manage_token_expires_at)
  where manage_token_hash is not null;

-- Capture parent page context for embedded bookings.

alter table if exists public.bookings
  add column if not exists parent_page_url text,
  add column if not exists parent_page_slug text;

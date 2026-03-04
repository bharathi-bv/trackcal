alter table if exists public.bookings
  drop constraint if exists bookings_status_check;

update public.bookings
set status = 'no_show'
where status = 'no-show';

alter table public.bookings
  add constraint bookings_status_check
  check (status in ('confirmed', 'pending', 'cancelled', 'no_show'));

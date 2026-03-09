-- Extended attribution identifiers for better paid-channel match rates.
-- Safe to run multiple times.

alter table if exists public.bookings
  add column if not exists gbraid text,
  add column if not exists wbraid text,
  add column if not exists fbc text,
  add column if not exists fbp text,
  add column if not exists ga_linker text;

create index if not exists bookings_gbraid_idx
  on public.bookings (gbraid)
  where gbraid is not null;

create index if not exists bookings_wbraid_idx
  on public.bookings (wbraid)
  where wbraid is not null;

create index if not exists bookings_fbc_idx
  on public.bookings (fbc)
  where fbc is not null;

create index if not exists bookings_fbp_idx
  on public.bookings (fbp)
  where fbp is not null;

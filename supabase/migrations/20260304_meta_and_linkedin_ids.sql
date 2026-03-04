alter table if exists public.host_settings
  add column if not exists meta_pixel_id text,
  add column if not exists linkedin_partner_id text;

-- Link each host_settings row to the Supabase auth user who owns it.
-- Nullable so existing rows aren't broken; populated on next settings save.

alter table if exists public.host_settings
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists host_settings_user_id_idx on public.host_settings (user_id);

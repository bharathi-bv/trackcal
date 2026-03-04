alter table if exists public.host_settings
  add column if not exists public_slug text;

create unique index if not exists host_settings_public_slug_unique_idx
  on public.host_settings (public_slug)
  where public_slug is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'host_settings_public_slug_check'
  ) then
    alter table public.host_settings
      add constraint host_settings_public_slug_check
      check (
        public_slug is null
        or public_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
      );
  end if;
end $$;

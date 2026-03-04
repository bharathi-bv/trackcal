alter table if exists public.event_types
  add column if not exists team_scheduling_mode text not null default 'round_robin',
  add column if not exists collective_required_member_ids uuid[] not null default '{}',
  add column if not exists collective_show_availability_tiers boolean not null default false,
  add column if not exists collective_min_available_hosts integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'event_types_team_scheduling_mode_check'
  ) then
    alter table public.event_types
      add constraint event_types_team_scheduling_mode_check
      check (team_scheduling_mode in ('round_robin', 'collective'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'event_types_collective_min_hosts_check'
  ) then
    alter table public.event_types
      add constraint event_types_collective_min_hosts_check
      check (collective_min_available_hosts is null or collective_min_available_hosts >= 1);
  end if;
end $$;

alter table if exists public.bookings
  add column if not exists assigned_host_ids uuid[] not null default '{}',
  add column if not exists calendar_events jsonb not null default '[]'::jsonb;

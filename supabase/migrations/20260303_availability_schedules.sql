create table if not exists public.availability_schedules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  weekly_availability jsonb not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.event_types
  add column if not exists availability_schedule_id uuid references public.availability_schedules(id) on delete set null;

create unique index if not exists availability_schedules_single_default_idx
  on public.availability_schedules (is_default)
  where is_default = true;

create index if not exists event_types_availability_schedule_id_idx
  on public.event_types (availability_schedule_id);

do $$
declare
  default_schedule_id uuid;
begin
  select id
  into default_schedule_id
  from public.availability_schedules
  where is_default = true
  limit 1;

  if default_schedule_id is null then
    insert into public.availability_schedules (name, weekly_availability, is_default)
    values (
      'Default schedule',
      coalesce(
        (select weekly_availability from public.host_settings order by id asc limit 1),
        '{
          "0": {"enabled": false, "start_hour": 9, "end_hour": 17},
          "1": {"enabled": true, "start_hour": 9, "end_hour": 17},
          "2": {"enabled": true, "start_hour": 9, "end_hour": 17},
          "3": {"enabled": true, "start_hour": 9, "end_hour": 17},
          "4": {"enabled": true, "start_hour": 9, "end_hour": 17},
          "5": {"enabled": true, "start_hour": 9, "end_hour": 17},
          "6": {"enabled": false, "start_hour": 9, "end_hour": 17}
        }'::jsonb
      ),
      true
    )
    returning id into default_schedule_id;
  end if;

  update public.event_types
  set availability_schedule_id = default_schedule_id
  where availability_schedule_id is null
    and weekly_availability is null;
end $$;

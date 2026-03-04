-- Event type stats RPC used by /app/dashboard/event-types
-- Computes total bookings, this-month bookings, and top source per event slug.

drop function if exists public.get_event_type_booking_stats(text);

create or replace function public.get_event_type_booking_stats(month_prefix text)
returns table (
  event_slug text,
  total bigint,
  this_month bigint,
  top_source text
)
language sql
stable
as $$
  with scoped as (
    select b.event_slug, b.utm_source, b.date
    from public.bookings b
    where b.event_slug is not null
      and b.status in ('confirmed', 'pending')
  ),
  totals as (
    select
      s.event_slug,
      count(*)::bigint as total,
      count(*) filter (
        where month_prefix is not null
          and month_prefix <> ''
          and s.date like month_prefix || '%'
      )::bigint as this_month
    from scoped s
    group by s.event_slug
  ),
  source_rank as (
    select
      s.event_slug,
      s.utm_source,
      count(*)::bigint as source_count,
      row_number() over (
        partition by s.event_slug
        order by count(*) desc, s.utm_source asc
      ) as rn
    from scoped s
    where s.utm_source is not null
    group by s.event_slug, s.utm_source
  )
  select
    t.event_slug,
    t.total,
    t.this_month,
    sr.utm_source as top_source
  from totals t
  left join source_rank sr
    on sr.event_slug = t.event_slug
   and sr.rn = 1;
$$;

create index if not exists bookings_status_event_slug_utm_source_idx
  on public.bookings (status, event_slug, utm_source);

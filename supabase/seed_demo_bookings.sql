-- ============================================================
-- CitaCal — Demo Bookings Seed
-- Run this in Supabase SQL Editor to populate test data.
-- Safe to run multiple times (uses INSERT, not UPSERT).
-- ============================================================

-- 90 days of realistic bookings spread across:
--   • Multiple UTM sources (google, linkedin, meta, email, direct)
--   • Multiple campaigns and mediums
--   • All 4 statuses (confirmed, pending, cancelled, no_show)
--   • Various hours (8 AM – 6 PM) and days of week
--   • Various lead times (same day through 3 weeks out)
--   • 2 event types: 30-min-demo and 60-min-deep-dive
--   • Click IDs on ~30% of bookings

DO $$
DECLARE
  -- Date anchors (relative to today)
  today DATE := CURRENT_DATE;
  base  DATE := CURRENT_DATE - INTERVAL '90 days';

  -- UTM sources
  sources TEXT[] := ARRAY['google','linkedin','meta','email','direct','google','google','linkedin'];
  mediums TEXT[] := ARRAY['cpc','paid_social','paid_social','newsletter','(none)','cpc','organic','organic'];
  campaigns TEXT[] := ARRAY[
    'q1-brand-search','q1-brand-search',
    'linkedin-saas-demo','linkedin-saas-demo',
    'meta-growth-jan','meta-growth-feb',
    'weekly-digest','product-update',
    null,null
  ];

  -- Slots
  slots TEXT[] := ARRAY[
    '09:00 AM','09:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM',
    '01:00 PM','01:30 PM','02:00 PM','02:30 PM','03:00 PM','03:30 PM',
    '04:00 PM','04:30 PM','05:00 PM'
  ];

  -- Statuses (weighted: ~55% confirmed, 20% pending, 15% cancelled, 10% no_show)
  statuses TEXT[] := ARRAY[
    'confirmed','confirmed','confirmed','confirmed','confirmed','confirmed',
    'pending','pending','pending','pending',
    'cancelled','cancelled','cancelled',
    'no_show','no_show',
    'confirmed','confirmed','confirmed','confirmed','confirmed'
  ];

  -- Names & emails
  names TEXT[] := ARRAY[
    'Alice Chen','Bob Patel','Carlos Ruiz','Diana Kim','Ethan Brooks',
    'Fiona Walsh','George Osei','Hannah Li','Ivan Petrov','Julia Santos',
    'Kevin Müller','Laura Novak','Marcus Reid','Nina Johansson','Omar Hassan',
    'Priya Sharma','Quinn Foster','Rachel Tang','Samuel Okafor','Tina Wong',
    'Umar Khan','Vera Lindström','Will Adeyemi','Xin Zhang','Yuki Nakamura',
    'Zara O''Brien','Aaron Cole','Beth Morales','Chris Dunn','Dana Pearce'
  ];

  -- Event type slugs
  event_slugs TEXT[] := ARRAY['30-min-demo','30-min-demo','30-min-demo','60-min-deep-dive'];

  i INT;
  booking_date DATE;
  src TEXT;
  med TEXT;
  cam TEXT;
  slot TEXT;
  stat TEXT;
  name_val TEXT;
  email_val TEXT;
  slug TEXT;
  src_idx INT;
  gclid_val TEXT;
  fbclid_val TEXT;
  li_fat_val TEXT;
BEGIN
  FOR i IN 1..120 LOOP
    -- Random date in last 90 days, biased toward recent (more bookings recently)
    booking_date := base + (random() * 90)::INT * INTERVAL '1 day';

    -- Skip weekends for realism
    WHILE EXTRACT(DOW FROM booking_date) IN (0, 6) LOOP
      booking_date := booking_date + INTERVAL '1 day';
    END LOOP;

    -- Cap at today
    IF booking_date > today THEN
      booking_date := today;
    END IF;

    -- Random UTM (80% attributed)
    IF random() > 0.20 THEN
      src_idx := 1 + (random() * (array_length(sources, 1) - 1))::INT;
      src  := sources[src_idx];
      med  := mediums[src_idx];
      cam  := campaigns[1 + (random() * (array_length(campaigns, 1) - 1))::INT];
    ELSE
      src  := NULL;
      med  := NULL;
      cam  := NULL;
    END IF;

    -- Random slot
    slot := slots[1 + (random() * (array_length(slots, 1) - 1))::INT];

    -- Random status
    stat := statuses[1 + (random() * (array_length(statuses, 1) - 1))::INT];

    -- Random person
    name_val := names[1 + (random() * (array_length(names, 1) - 1))::INT];
    email_val := lower(replace(name_val, ' ', '.')) || '@example.com';

    -- Random event type
    slug := event_slugs[1 + (random() * (array_length(event_slugs, 1) - 1))::INT];

    -- Click IDs on ~30% of attributed bookings
    gclid_val  := NULL;
    fbclid_val := NULL;
    li_fat_val := NULL;

    IF src = 'google' AND random() > 0.40 THEN
      gclid_val := 'CjwKCA' || upper(substring(md5(random()::TEXT) FROM 1 FOR 16));
    ELSIF src = 'meta' AND random() > 0.50 THEN
      fbclid_val := 'IwAR' || substring(md5(random()::TEXT) FROM 1 FOR 20);
    ELSIF src = 'linkedin' AND random() > 0.50 THEN
      li_fat_val := 'AQH' || substring(md5(random()::TEXT) FROM 1 FOR 18);
    END IF;

    INSERT INTO bookings (
      date, time, name, email,
      utm_source, utm_medium, utm_campaign,
      gclid, fbclid, li_fat_id,
      status, event_slug,
      created_at
    ) VALUES (
      booking_date,
      slot,
      name_val,
      email_val,
      src, med, cam,
      gclid_val, fbclid_val, li_fat_val,
      stat,
      slug,
      -- created_at = 0–14 days before booking date (simulates lead time)
      (booking_date - ((random() * 14)::INT * INTERVAL '1 day'))::TIMESTAMP WITH TIME ZONE
    );
  END LOOP;
END;
$$;

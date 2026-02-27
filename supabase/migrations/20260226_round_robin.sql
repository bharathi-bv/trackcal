-- ── Round-Robin Team Scheduling ────────────────────────────────────────────
--
-- Strategy:
--   - New team_members table: one row per team member the admin adds.
--     Each member stores their own Google OAuth tokens (independent calendar).
--   - event_types.assigned_member_ids: which team members handle each event.
--   - bookings.assigned_to: which member got this specific booking.
--   - Race condition guard: unique index on (assigned_to, date, time) for
--     non-cancelled bookings. POST handler catches unique_violation + retries.
--
-- Run in Supabase SQL editor. Safe to run multiple times (IF NOT EXISTS guards).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. team_members table ────────────────────────────────────────────────────
-- google_token_expiry is TEXT (not timestamptz) — stores ms-since-epoch string.
-- This matches the pattern in host_settings to avoid silent insert failures.

CREATE TABLE IF NOT EXISTS public.team_members (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  name                  text NOT NULL,
  email                 text NOT NULL,
  photo_url             text,
  google_access_token   text,
  google_refresh_token  text,
  google_token_expiry   text,
  is_active             boolean NOT NULL DEFAULT true,
  last_booking_at       timestamptz     -- NULL = never booked (gets priority in round-robin)
);

-- ── 2. Which team members handle each event type ─────────────────────────────
-- Empty array = fall back to single host (existing behaviour unchanged).

ALTER TABLE public.event_types
  ADD COLUMN IF NOT EXISTS assigned_member_ids uuid[] NOT NULL DEFAULT '{}';

-- ── 3. Which team member was assigned each booking ───────────────────────────
-- NULL = booked to the host (backward compat with all existing bookings).

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.team_members(id) ON DELETE SET NULL;

-- ── 4. Race condition guard ──────────────────────────────────────────────────
-- Prevents two simultaneous POSTs from assigning the same member to the same
-- slot. The booking POST catches unique_violation (code 23505) and retries
-- with the next available member.
-- Partial index: only applies when assigned_to IS NOT NULL and not cancelled.

CREATE UNIQUE INDEX IF NOT EXISTS bookings_member_slot_unique_idx
  ON public.bookings (assigned_to, date, time)
  WHERE assigned_to IS NOT NULL
    AND status IN ('confirmed', 'pending');

-- ── 5. Performance indexes ────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS bookings_assigned_to_idx
  ON public.bookings (assigned_to);

CREATE INDEX IF NOT EXISTS team_members_last_booking_idx
  ON public.team_members (last_booking_at ASC NULLS FIRST);

-- ── 6. RLS ────────────────────────────────────────────────────────────────────
-- Authenticated users (dashboard) can manage all team members.
-- Anon users cannot read team member data (tokens are sensitive).

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth: manage team members"
  ON public.team_members FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

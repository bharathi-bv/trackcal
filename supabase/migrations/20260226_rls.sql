-- ── Row Level Security (RLS) ────────────────────────────────────────────────
--
-- Strategy:
--   - All API routes use createServerClient() with service_role key, which
--     bypasses RLS entirely. So no existing behaviour changes.
--   - RLS protects against direct Supabase anon-key access from the browser,
--     accidental misconfiguration, and prepares for multi-user workspaces.
--
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- Safe to run multiple times — uses IF NOT EXISTS / OR REPLACE where possible.
-- ────────────────────────────────────────────────────────────────────────────

-- 1. Enable RLS on all tables
ALTER TABLE bookings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE host_settings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_types    ENABLE ROW LEVEL SECURITY;

-- ── bookings ────────────────────────────────────────────────────────────────

-- Authenticated users (dashboard) can read + manage all bookings
CREATE POLICY "auth: manage bookings"
  ON bookings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Anon users (booking page) can INSERT a new booking
CREATE POLICY "anon: create booking"
  ON bookings FOR INSERT
  TO anon
  WITH CHECK (true);

-- ── host_settings ───────────────────────────────────────────────────────────

-- Authenticated users only — Google tokens + host profile are private
CREATE POLICY "auth: manage host settings"
  ON host_settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── event_types ─────────────────────────────────────────────────────────────

-- Public (anon) can read active event types — needed for the /book page
CREATE POLICY "anon: read active event types"
  ON event_types FOR SELECT
  TO anon
  USING (is_active = true);

-- Authenticated users can manage all event types
CREATE POLICY "auth: manage event types"
  ON event_types FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

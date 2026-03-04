-- ── Team Member CitaCal Accounts ──────────────────────────────────────────
--
-- Adds user_id to team_members so each team member can have their own
-- CitaCal account (via Supabase Auth invite). After they sign up via the
-- invite email, /auth/callback sets this column to their auth.users.id.
--
-- This enables:
--   - Team members to connect their own Google Calendar without admin help
--   - Self-service calendar disconnect from their own settings page
--   - Dashboard redirect: team members → /member/settings, not /dashboard
--
-- Run in Supabase SQL editor. Safe to run multiple times (IF NOT EXISTS).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Ensures one team_members row per auth account
CREATE UNIQUE INDEX IF NOT EXISTS team_members_user_id_idx
  ON public.team_members (user_id)
  WHERE user_id IS NOT NULL;

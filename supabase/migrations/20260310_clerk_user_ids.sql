-- Migrate user_id columns from Supabase Auth UUIDs to Clerk string IDs.
-- Clerk user IDs are strings like "user_2NNFEzf..." — not UUIDs in auth.users.
-- Drop the FK constraints and change column type to text.

ALTER TABLE public.host_settings
  DROP CONSTRAINT IF EXISTS host_settings_user_id_fkey;

ALTER TABLE public.team_members
  DROP CONSTRAINT IF EXISTS team_members_user_id_fkey;

ALTER TABLE public.host_settings
  ALTER COLUMN user_id TYPE text;

ALTER TABLE public.team_members
  ALTER COLUMN user_id TYPE text;

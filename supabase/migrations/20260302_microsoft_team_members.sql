-- Add Microsoft Calendar OAuth columns to team_members
ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS microsoft_access_token text,
  ADD COLUMN IF NOT EXISTS microsoft_refresh_token text,
  ADD COLUMN IF NOT EXISTS microsoft_token_expiry text;

-- Zoom OAuth tokens for the host account
ALTER TABLE host_settings
  ADD COLUMN IF NOT EXISTS zoom_access_token text,
  ADD COLUMN IF NOT EXISTS zoom_refresh_token text,
  ADD COLUMN IF NOT EXISTS zoom_token_expiry text,
  ADD COLUMN IF NOT EXISTS zoom_user_id text;

-- Zoom meeting ID per booking (for cancellation)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS zoom_meeting_id text;

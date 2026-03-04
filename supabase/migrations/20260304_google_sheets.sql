-- Google Sheets integration: per-host OAuth tokens + connected sheet ID
ALTER TABLE host_settings
  ADD COLUMN IF NOT EXISTS sheet_access_token  text,
  ADD COLUMN IF NOT EXISTS sheet_refresh_token text,
  ADD COLUMN IF NOT EXISTS sheet_token_expiry  text,   -- ms-since-epoch as text
  ADD COLUMN IF NOT EXISTS sheet_id            text;   -- extracted from the Sheet URL

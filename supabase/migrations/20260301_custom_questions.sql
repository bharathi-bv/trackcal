-- Add custom_questions to event_types
ALTER TABLE event_types
  ADD COLUMN IF NOT EXISTS custom_questions jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Add custom_answers to bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS custom_answers jsonb;

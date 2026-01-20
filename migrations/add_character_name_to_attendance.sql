-- Add character_name column to attendance_records for tracking unlinked attendees
-- This allows us to track attendance for people who don't have LootList+ accounts yet
-- When they eventually create a character, we can link these records

ALTER TABLE attendance_records
  ADD COLUMN character_name VARCHAR(255);

-- Add comment explaining the purpose
COMMENT ON COLUMN attendance_records.character_name IS 'Character name for unlinked attendees (when character_id is NULL). Used to track attendance before user creates account.';

-- Create index for faster lookups when trying to link records
CREATE INDEX idx_attendance_records_character_name ON attendance_records(character_name) WHERE character_name IS NOT NULL;

-- Update the constraint to allow either character_id OR character_name (but at least one)
-- Drop existing check constraint if it exists
ALTER TABLE attendance_records DROP CONSTRAINT IF EXISTS attendance_records_character_identifier_check;

-- Add new constraint: must have either character_id or character_name
ALTER TABLE attendance_records
  ADD CONSTRAINT attendance_records_character_identifier_check
  CHECK (
    (character_id IS NOT NULL) OR (character_name IS NOT NULL AND character_name != '')
  );

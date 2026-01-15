-- Add character_id column to attendance_records table
-- This updates the old user-based attendance to support characters

-- Add the character_id column
ALTER TABLE attendance_records
ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES characters(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_attendance_records_character_id ON attendance_records(character_id);

-- Add notes column if it doesn't exist
ALTER TABLE attendance_records
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add timestamps if they don't exist
ALTER TABLE attendance_records
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE attendance_records
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add unique constraint for character-based attendance
DROP INDEX IF EXISTS idx_attendance_records_raid_character;
CREATE UNIQUE INDEX idx_attendance_records_raid_character
ON attendance_records(raid_event_id, character_id)
WHERE character_id IS NOT NULL;

-- Verify the columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'attendance_records'
ORDER BY ordinal_position;

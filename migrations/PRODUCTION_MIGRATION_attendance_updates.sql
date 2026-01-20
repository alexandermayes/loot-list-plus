-- =====================================================
-- PRODUCTION MIGRATION: Attendance System Updates
-- =====================================================
-- This adds new attendance tracking features:
-- - Late arrivals
-- - Benched players
-- - Skipped raid days
-- - Unlinked attendees (for players without accounts)
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Add New Columns to attendance_records
-- =====================================================

-- Add late and benched tracking
ALTER TABLE attendance_records
  ADD COLUMN IF NOT EXISTS was_late BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS was_benched BOOLEAN DEFAULT false;

-- Add character_name for unlinked attendees
ALTER TABLE attendance_records
  ADD COLUMN IF NOT EXISTS character_name VARCHAR(255);

-- Add comments
COMMENT ON COLUMN attendance_records.was_late IS 'Player attended but was late';
COMMENT ON COLUMN attendance_records.was_benched IS 'Player was present but on bench';
COMMENT ON COLUMN attendance_records.character_name IS 'Character name for unlinked attendees (when character_id is NULL). Used to track attendance before user creates account.';

-- =====================================================
-- STEP 2: Add New Columns to raid_events
-- =====================================================

-- Add skip tracking
ALTER TABLE raid_events
  ADD COLUMN IF NOT EXISTS is_skipped BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS skip_reason TEXT;

-- Add comments
COMMENT ON COLUMN raid_events.is_skipped IS 'Raid was skipped (holiday, cancelled, etc.)';
COMMENT ON COLUMN raid_events.skip_reason IS 'Reason the raid was skipped';

-- =====================================================
-- STEP 3: Create Index for character_name Lookups
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_attendance_records_character_name
  ON attendance_records(character_name)
  WHERE character_name IS NOT NULL;

-- =====================================================
-- STEP 4: Update Constraints
-- =====================================================

-- Drop existing check constraint if it exists
ALTER TABLE attendance_records
  DROP CONSTRAINT IF EXISTS attendance_records_character_identifier_check;

-- Add new constraint: must have either character_id OR character_name
ALTER TABLE attendance_records
  ADD CONSTRAINT attendance_records_character_identifier_check
  CHECK (
    (character_id IS NOT NULL) OR (character_name IS NOT NULL AND character_name != '')
  );

-- =====================================================
-- STEP 5: Log Migration Results
-- =====================================================

DO $$
DECLARE
  attendance_count INT;
  raid_count INT;
BEGIN
  SELECT COUNT(*) INTO attendance_count FROM attendance_records;
  SELECT COUNT(*) INTO raid_count FROM raid_events;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Attendance System Updated!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total attendance records: %', attendance_count;
  RAISE NOTICE 'Total raid events: %', raid_count;
  RAISE NOTICE 'New features available:';
  RAISE NOTICE '  - Late arrivals tracking';
  RAISE NOTICE '  - Benched players tracking';
  RAISE NOTICE '  - Skipped raid days';
  RAISE NOTICE '  - Unlinked attendee support';
  RAISE NOTICE '========================================';
END $$;

COMMIT;

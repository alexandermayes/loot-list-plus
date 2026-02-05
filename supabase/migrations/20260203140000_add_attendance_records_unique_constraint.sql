-- =====================================================
-- Add unique constraint for attendance_records
-- =====================================================
-- The upsert uses onConflict: 'raid_event_id,character_id'
-- but there's no unique constraint on these columns
-- =====================================================

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'attendance_records_raid_event_id_character_id_key'
  ) THEN
    ALTER TABLE attendance_records
    ADD CONSTRAINT attendance_records_raid_event_id_character_id_key
    UNIQUE (raid_event_id, character_id);
  END IF;
END $$;

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'attendance_records unique constraint added!';
  RAISE NOTICE 'Upserts on raid_event_id,character_id now work';
  RAISE NOTICE '========================================';
END $$;

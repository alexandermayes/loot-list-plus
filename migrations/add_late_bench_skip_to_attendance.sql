-- Add "late" and "bench" columns to attendance_records
ALTER TABLE attendance_records
  ADD COLUMN was_late BOOLEAN DEFAULT false,
  ADD COLUMN was_benched BOOLEAN DEFAULT false;

-- Add "is_skipped" column to raid_events for holidays/cancelled raids
ALTER TABLE raid_events
  ADD COLUMN is_skipped BOOLEAN DEFAULT false,
  ADD COLUMN skip_reason TEXT;

-- Add comment explaining the attendance states
COMMENT ON COLUMN attendance_records.was_late IS 'Player attended but was late';
COMMENT ON COLUMN attendance_records.was_benched IS 'Player was present but on bench';
COMMENT ON COLUMN raid_events.is_skipped IS 'Raid was skipped (holiday, cancelled, etc.)';
COMMENT ON COLUMN raid_events.skip_reason IS 'Reason the raid was skipped';

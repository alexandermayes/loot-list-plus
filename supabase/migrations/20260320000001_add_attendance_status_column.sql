-- Add status column to attendance_records
-- Replaces the need to resolve status from 5 boolean columns.
-- Dual-write: both status column and legacy booleans are maintained
-- during transition. Eventually booleans can be dropped.

-- Step 1: Add the column
ALTER TABLE attendance_records
  ADD COLUMN IF NOT EXISTS status TEXT
  CHECK (status IN ('attended', 'late', 'benched', 'no_show', 'excused', 'signed_up', 'absent'))
  DEFAULT 'absent';

-- Step 2: Backfill from existing boolean columns
-- Uses the same priority order as resolveStatus() in domain/scoring/attendance.ts
UPDATE attendance_records SET status =
  CASE
    WHEN no_call_no_show = true THEN 'no_show'
    WHEN is_excused = true THEN 'excused'
    WHEN was_benched = true THEN 'benched'
    WHEN attended = true AND was_late = true THEN 'late'
    WHEN attended = true THEN 'attended'
    WHEN signed_up = true THEN 'signed_up'
    ELSE 'absent'
  END
WHERE status = 'absent' OR status IS NULL;

-- Step 3: Index for filtered queries
CREATE INDEX IF NOT EXISTS idx_attendance_records_status
  ON attendance_records (status);

DO $$
BEGIN
  RAISE NOTICE 'attendance_records.status column added and backfilled';
END $$;

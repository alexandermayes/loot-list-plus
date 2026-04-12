-- Add points_override and modified_by to attendance_records.
--
-- points_override: officer can manually set attendance points for a record
-- (e.g., 0.5 for someone who left early). NULL = use computed value.
--
-- modified_by: tracks which officer last changed this attendance record.
-- Complements the audit_logs system with inline attribution.

ALTER TABLE attendance_records
  ADD COLUMN IF NOT EXISTS points_override DECIMAL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS modified_by UUID REFERENCES auth.users(id) DEFAULT NULL;

COMMENT ON COLUMN attendance_records.points_override IS 'Officer override for attendance points. NULL = use computed value from scoring engine.';
COMMENT ON COLUMN attendance_records.modified_by IS 'User ID of the officer who last modified this record.';

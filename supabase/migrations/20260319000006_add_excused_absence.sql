-- Add excused absence support to attendance_records.
-- Excused absences (sick day, holiday, pre-approved leave) should not count
-- against a raider's attendance score — the raid is excluded from the denominator.

ALTER TABLE attendance_records
  ADD COLUMN IF NOT EXISTS is_excused BOOLEAN DEFAULT false;

COMMENT ON COLUMN attendance_records.is_excused IS 'Excused absence (sick day, holiday). Excluded from attendance scoring denominator like NCNS.';

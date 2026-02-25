-- Drop the incorrect unique constraint on (raid_event_id, user_id).
-- A user with multiple characters in the same guild needs separate
-- attendance records per character per raid.
-- The correct constraint is (raid_event_id, character_id), added in
-- 20260203140000_add_attendance_records_unique_constraint.sql.

ALTER TABLE attendance_records
  DROP CONSTRAINT IF EXISTS attendance_records_raid_event_id_user_id_key;

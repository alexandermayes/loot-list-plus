-- Clear all attendance and raid data
-- This will remove all attendance records and raid events

-- Delete all attendance records first (due to foreign key constraint)
DELETE FROM attendance_records;

-- Delete all raid events
DELETE FROM raid_events;

-- Verify deletion
SELECT 'attendance_records' as table_name, COUNT(*) as remaining_records FROM attendance_records
UNION ALL
SELECT 'raid_events' as table_name, COUNT(*) as remaining_records FROM raid_events;

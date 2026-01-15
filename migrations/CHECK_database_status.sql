-- Check what tables and columns exist in the database
-- Run this to see what's already set up

-- Check if characters table exists
SELECT
  'characters' as table_name,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'characters'
  ) as exists;

-- Check if character_guild_memberships table exists
SELECT
  'character_guild_memberships' as table_name,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'character_guild_memberships'
  ) as exists;

-- Check if raid_events table exists
SELECT
  'raid_events' as table_name,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'raid_events'
  ) as exists;

-- Check if attendance_records table exists
SELECT
  'attendance_records' as table_name,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'attendance_records'
  ) as exists;

-- Check if loot_submissions has character_id column
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'loot_submissions'
ORDER BY ordinal_position;

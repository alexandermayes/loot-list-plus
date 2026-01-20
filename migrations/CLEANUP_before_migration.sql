-- =====================================================
-- CLEANUP: Remove partially created character system tables
-- =====================================================
-- Run this FIRST to clean up any partially created tables
-- Then run the full PRODUCTION_MIGRATION_character_system.sql
-- =====================================================

BEGIN;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS user_active_characters CASCADE;
DROP TABLE IF EXISTS character_guild_memberships CASCADE;
DROP TABLE IF EXISTS characters CASCADE;

-- Remove character_id column from loot_submissions if it exists
ALTER TABLE loot_submissions DROP COLUMN IF EXISTS character_id;

-- Remove attendance columns if they exist
ALTER TABLE attendance_records DROP COLUMN IF EXISTS was_late;
ALTER TABLE attendance_records DROP COLUMN IF EXISTS was_benched;
ALTER TABLE attendance_records DROP COLUMN IF EXISTS character_name;
ALTER TABLE attendance_records DROP CONSTRAINT IF EXISTS attendance_records_character_identifier_check;

-- Remove raid event columns if they exist
ALTER TABLE raid_events DROP COLUMN IF EXISTS is_skipped;
ALTER TABLE raid_events DROP COLUMN IF EXISTS skip_reason;

COMMIT;

-- Confirmation message
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Cleanup Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Character system tables removed.';
  RAISE NOTICE 'Now run PRODUCTION_MIGRATION_character_system.sql';
  RAISE NOTICE '========================================';
END $$;

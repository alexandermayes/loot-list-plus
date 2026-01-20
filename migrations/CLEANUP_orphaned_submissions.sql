-- =====================================================
-- CLEANUP: Remove orphaned loot submissions
-- =====================================================
-- Remove submissions with NULL character_id
-- These are from before the character system migration
-- =====================================================

BEGIN;

-- First, delete related submission items
DELETE FROM loot_submission_items
WHERE submission_id IN (
  SELECT id FROM loot_submissions
  WHERE character_id IS NULL
);

-- Then delete the orphaned submissions
DELETE FROM loot_submissions
WHERE character_id IS NULL;

COMMIT;

-- Show results
DO $$
DECLARE
  deleted_items INTEGER;
  deleted_subs INTEGER;
BEGIN
  -- This won't give exact count but will confirm completion
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Cleanup Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Removed orphaned submissions from before';
  RAISE NOTICE 'the character system migration.';
  RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- CLEANUP: Remove orphaned loot submissions (ADMIN)
-- =====================================================
-- Remove submissions with NULL character_id
-- Temporarily disables RLS to allow deletion
-- =====================================================

BEGIN;

-- Temporarily disable RLS
ALTER TABLE loot_submission_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE loot_submissions DISABLE ROW LEVEL SECURITY;

-- Delete related submission items first
DELETE FROM loot_submission_items
WHERE submission_id IN (
  SELECT id FROM loot_submissions
  WHERE character_id IS NULL
);

-- Delete the orphaned submissions
DELETE FROM loot_submissions
WHERE character_id IS NULL;

-- Re-enable RLS
ALTER TABLE loot_submission_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE loot_submissions ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Show results
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Cleanup Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Removed all submissions with NULL character_id.';
  RAISE NOTICE 'Character names should now display correctly.';
  RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- CLEANUP: Remove duplicate loot submission items
-- =====================================================
-- This removes duplicate entries keeping only the most recent one
-- =====================================================

BEGIN;

-- Delete duplicate entries, keeping only the most recent (highest ID) for each (submission_id, rank, slot)
DELETE FROM loot_submission_items
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY submission_id, rank, slot
        ORDER BY id DESC
      ) as row_num
    FROM loot_submission_items
  ) sub
  WHERE row_num > 1
);

COMMIT;

-- Show results
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Cleanup Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Deleted % duplicate entries', deleted_count;
  RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- FIX: Drop the problematic guild viewing policy
-- =====================================================
-- Restore own characters viewing only
-- =====================================================

BEGIN;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Guild members can view guild characters" ON characters;

COMMIT;

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Policy Dropped!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Your characters should be visible again.';
  RAISE NOTICE 'Refresh browser.';
  RAISE NOTICE '========================================';
END $$;

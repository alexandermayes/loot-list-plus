-- =====================================================
-- FIX: Drop only the problematic recursive policy
-- =====================================================
-- Simply removes the "Guild members can view guild characters" policy
-- that was causing infinite recursion
-- =====================================================

-- Drop the problematic policy (this is the one causing infinite recursion)
DROP POLICY IF EXISTS "Guild members can view guild characters" ON characters;

-- Confirmation message
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Recursive Policy Removed!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Infinite recursion policy deleted.';
  RAISE NOTICE 'Refresh your browser to see changes.';
  RAISE NOTICE '========================================';
END $$;

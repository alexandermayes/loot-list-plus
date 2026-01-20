-- =====================================================
-- FIX: Allow users to see ONLY their own characters
-- =====================================================
-- Temporary fix to restore basic functionality
-- =====================================================

BEGIN;

-- Drop all guild viewing policies
DROP POLICY IF EXISTS "Guild members can view guild characters" ON characters;

-- Keep only the "own characters" policy (this should already exist)
-- Just to be safe, recreate it
DROP POLICY IF EXISTS "Users can view own characters" ON characters;

CREATE POLICY "Users can view own characters" ON characters
  FOR SELECT
  USING (user_id = auth.uid());

COMMIT;

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Characters RLS Reset!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Users can now see their own characters.';
  RAISE NOTICE 'Guild viewing temporarily disabled.';
  RAISE NOTICE 'Refresh browser to restore your characters.';
  RAISE NOTICE '========================================';
END $$;

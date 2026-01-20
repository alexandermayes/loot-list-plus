-- =====================================================
-- FIX: Remove infinite recursion in characters RLS policy
-- =====================================================
-- The "Guild members can view guild characters" policy was causing
-- infinite recursion by querying characters table within its own policy
-- =====================================================

BEGIN;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Guild members can view guild characters" ON characters;

-- Simplified policy: Users can only view their own characters
-- Guild-wide character viewing will be handled at the application level
-- or through character_guild_memberships queries
CREATE POLICY "Users can view own characters" ON characters
  FOR SELECT
  USING (auth.uid() = user_id);

-- Ensure the basic policies exist
DROP POLICY IF EXISTS "Users can insert own characters" ON characters;
CREATE POLICY "Users can insert own characters" ON characters
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own characters" ON characters;
CREATE POLICY "Users can update own characters" ON characters
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own characters" ON characters;
CREATE POLICY "Users can delete own characters" ON characters
  FOR DELETE
  USING (auth.uid() = user_id);

COMMIT;

-- Confirmation message
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS Policy Fix Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Removed infinite recursion policy.';
  RAISE NOTICE 'Users can now view their own characters.';
  RAISE NOTICE '========================================';
END $$;

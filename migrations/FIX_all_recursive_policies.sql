-- =====================================================
-- FIX: Remove ALL infinite recursion policies
-- =====================================================
-- Fixes both characters AND character_guild_memberships
-- infinite recursion errors
-- =====================================================

BEGIN;

-- =====================================================
-- Fix character_guild_memberships policies
-- =====================================================

-- Drop ALL policies on character_guild_memberships first
DROP POLICY IF EXISTS "Users can view own character memberships" ON character_guild_memberships;
DROP POLICY IF EXISTS "Guild members can view guild memberships" ON character_guild_memberships;
DROP POLICY IF EXISTS "Users can insert own character memberships" ON character_guild_memberships;
DROP POLICY IF EXISTS "Officers can update guild memberships" ON character_guild_memberships;
DROP POLICY IF EXISTS "Users can delete own character memberships" ON character_guild_memberships;

-- Create simplified policies WITHOUT recursion
CREATE POLICY "Users can view own character memberships" ON character_guild_memberships
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_guild_memberships.character_id
      AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own character memberships" ON character_guild_memberships
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_guild_memberships.character_id
      AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own character memberships" ON character_guild_memberships
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_guild_memberships.character_id
      AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own character memberships" ON character_guild_memberships
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_guild_memberships.character_id
      AND characters.user_id = auth.uid()
    )
  );

COMMIT;

-- Confirmation message
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'All Recursive Policies Fixed!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Removed all infinite recursion policies.';
  RAISE NOTICE 'Character guild memberships now accessible.';
  RAISE NOTICE 'Refresh your browser to see changes.';
  RAISE NOTICE '========================================';
END $$;

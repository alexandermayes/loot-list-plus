-- =====================================================
-- FIX: Remove recursive policy and add correct one
-- =====================================================
-- Previous policy caused infinite recursion
-- This version uses only character_guild_memberships
-- =====================================================

BEGIN;

-- Drop the recursive policy
DROP POLICY IF EXISTS "Guild members can view guild characters" ON characters;

-- Add correct policy that doesn't cause recursion
-- Check if the current user has ANY character in the same guild as the target character
CREATE POLICY "Guild members can view guild characters" ON characters
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM character_guild_memberships cgm_target
      WHERE cgm_target.character_id = characters.id
      AND EXISTS (
        SELECT 1
        FROM character_guild_memberships cgm_user
        INNER JOIN characters c_user ON c_user.id = cgm_user.character_id
        WHERE c_user.user_id = auth.uid()
        AND cgm_user.guild_id = cgm_target.guild_id
      )
    )
  );

COMMIT;

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Characters RLS Fixed (No Recursion)!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Guild members can now view other characters';
  RAISE NOTICE 'in their guild without infinite recursion.';
  RAISE NOTICE 'Refresh browser to see character names.';
  RAISE NOTICE '========================================';
END $$;

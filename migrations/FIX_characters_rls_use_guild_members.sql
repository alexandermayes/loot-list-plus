-- =====================================================
-- FIX: Use guild_members table to avoid recursion
-- =====================================================
-- Check guild membership via guild_members (old system)
-- to avoid recursive queries on characters table
-- =====================================================

BEGIN;

-- Drop all previous problematic policies
DROP POLICY IF EXISTS "Guild members can view guild characters" ON characters;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS get_user_guild_ids(UUID);

-- Add policy using guild_members table (no recursion)
CREATE POLICY "Guild members can view guild characters" ON characters
  FOR SELECT
  USING (
    -- User can see their own characters
    user_id = auth.uid()
    OR
    -- OR user is in the same guild (check via character_guild_memberships and guild_members)
    EXISTS (
      SELECT 1
      FROM character_guild_memberships cgm_target
      INNER JOIN guild_members gm ON gm.guild_id = cgm_target.guild_id
      WHERE cgm_target.character_id = characters.id
      AND gm.user_id = auth.uid()
      AND gm.is_active = true
    )
  );

COMMIT;

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Characters RLS Fixed!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Using guild_members table to avoid recursion.';
  RAISE NOTICE 'Guild members can now view other characters.';
  RAISE NOTICE 'Refresh browser to see character names.';
  RAISE NOTICE '========================================';
END $$;

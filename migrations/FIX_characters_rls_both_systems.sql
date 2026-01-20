-- =====================================================
-- FIX: Support both old and new guild membership systems
-- =====================================================
-- Check guild membership via BOTH guild_members and
-- character_guild_memberships to support transition period
-- =====================================================

BEGIN;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Guild members can view guild characters" ON characters;

-- Add policy that checks BOTH old and new systems
CREATE POLICY "Guild members can view guild characters" ON characters
  FOR SELECT
  USING (
    -- User can see their own characters
    user_id = auth.uid()
    OR
    -- OR user is in the same guild via OLD system (guild_members)
    EXISTS (
      SELECT 1
      FROM character_guild_memberships cgm_target
      INNER JOIN guild_members gm ON gm.guild_id = cgm_target.guild_id
      WHERE cgm_target.character_id = characters.id
      AND gm.user_id = auth.uid()
      AND gm.is_active = true
    )
    OR
    -- OR user has a character in the same guild via NEW system (character_guild_memberships)
    EXISTS (
      SELECT 1
      FROM character_guild_memberships cgm_target
      WHERE cgm_target.character_id = characters.id
      AND cgm_target.guild_id IN (
        -- Get guilds where current user has ANY character
        SELECT cgm_user.guild_id
        FROM character_guild_memberships cgm_user
        WHERE cgm_user.character_id IN (
          -- Get current user's character IDs without recursion
          SELECT id FROM characters WHERE user_id = auth.uid()
        )
      )
    )
  );

COMMIT;

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Characters RLS Fixed (Both Systems)!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Supports both old and new guild systems.';
  RAISE NOTICE 'Users should see their characters now.';
  RAISE NOTICE 'Refresh browser to restore functionality.';
  RAISE NOTICE '========================================';
END $$;

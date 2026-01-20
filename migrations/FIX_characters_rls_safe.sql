-- =====================================================
-- FIX: Simple safe characters policy
-- =====================================================
-- Allow users to see their own characters and characters
-- in any guild they're a member of (via guild_members table only)
-- =====================================================

BEGIN;

-- Drop all problematic policies
DROP POLICY IF EXISTS "Guild members can view guild characters" ON characters;

-- Simple policy: own characters + guild members can see each other
CREATE POLICY "Guild members can view guild characters" ON characters
  FOR SELECT
  USING (
    -- User can see their own characters
    user_id = auth.uid()
    OR
    -- OR character is in a guild where user is a member
    EXISTS (
      SELECT 1
      FROM guild_members gm
      WHERE gm.user_id = auth.uid()
      AND gm.is_active = true
      AND EXISTS (
        SELECT 1
        FROM character_guild_memberships cgm
        WHERE cgm.character_id = characters.id
        AND cgm.guild_id = gm.guild_id
      )
    )
  );

COMMIT;

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Characters RLS Fixed (Safe)!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'No recursion - uses only guild_members.';
  RAISE NOTICE 'Refresh browser to restore functionality.';
  RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- FIX: Add guild viewing back (safe, no recursion)
-- =====================================================
-- Allows officers to see other characters in submissions
-- =====================================================

BEGIN;

-- Add policy to view characters in guilds where user is a member
CREATE POLICY "Guild members can view guild characters" ON characters
  FOR SELECT
  USING (
    -- Character is in a guild where the current user is a member
    EXISTS (
      SELECT 1
      FROM character_guild_memberships cgm
      INNER JOIN guild_members gm ON gm.guild_id = cgm.guild_id
      WHERE cgm.character_id = characters.id
      AND gm.user_id = auth.uid()
      AND gm.is_active = true
    )
  );

COMMIT;

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Guild Viewing Enabled!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Guild members can now view other characters';
  RAISE NOTICE 'in their guild for loot submissions.';
  RAISE NOTICE 'Refresh browser to see character names.';
  RAISE NOTICE '========================================';
END $$;

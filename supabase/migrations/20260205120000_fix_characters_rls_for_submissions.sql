-- =============================================================================
-- Fix characters RLS to allow viewing characters with loot submissions
-- =============================================================================
-- Officers need to see character info (name, class) for characters that have
-- submitted loot lists to their guild, even if those characters aren't
-- guild members yet or have inactive memberships.
-- =============================================================================

-- Add policy for guild members to view characters that have submitted to their guild
CREATE POLICY "Guild members can view submitting characters" ON characters
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM loot_submissions ls
      WHERE ls.character_id = characters.id
        AND ls.guild_id IN (SELECT get_current_user_guild_ids())
    )
  );

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Added RLS policy for submission characters';
  RAISE NOTICE '========================================';
END $$;

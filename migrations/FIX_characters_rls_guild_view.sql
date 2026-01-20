-- =====================================================
-- FIX: Allow guild members to view other characters
-- =====================================================
-- Officers need to see character names in submissions
-- =====================================================

BEGIN;

-- Add policy to allow guild members to view characters in their guild
CREATE POLICY "Guild members can view guild characters" ON characters
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm1
      INNER JOIN character_guild_memberships cgm2 ON cgm1.guild_id = cgm2.guild_id
      INNER JOIN characters c ON c.id = cgm1.character_id
      WHERE c.user_id = auth.uid()
      AND cgm2.character_id = characters.id
    )
  );

COMMIT;

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Characters RLS Fixed!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Guild members can now view other characters';
  RAISE NOTICE 'in their guild (e.g., for loot submissions).';
  RAISE NOTICE 'Refresh browser to see character names.';
  RAISE NOTICE '========================================';
END $$;

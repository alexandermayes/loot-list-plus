-- =====================================================
-- FIX: Allow officers to delete any submissions in their guild
-- =====================================================
-- Officers need to be able to delete submissions for moderation
-- =====================================================

BEGIN;

-- Add policy for officers to delete any submission in their guild
DROP POLICY IF EXISTS "Officers can delete guild submissions" ON loot_submissions;

CREATE POLICY "Officers can delete guild submissions" ON loot_submissions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM guild_members gm
      INNER JOIN guild_roles gr ON gr.guild_id = gm.guild_id AND gr.name = gm.role
      WHERE gm.user_id = auth.uid()
      AND gm.guild_id = loot_submissions.guild_id
      AND gm.is_active = true
      AND gr.position >= 50
    )
  );

COMMIT;

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Officer Delete Policy Added!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Officers can now delete any submissions';
  RAISE NOTICE 'in their guild for moderation.';
  RAISE NOTICE 'Refresh browser to test deletion.';
  RAISE NOTICE '========================================';
END $$;

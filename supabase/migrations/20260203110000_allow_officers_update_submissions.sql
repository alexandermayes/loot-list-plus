-- =====================================================
-- Allow officers to update (approve/reject) submissions
-- =====================================================
-- Officers need to be able to change submission status
-- to 'approved' or 'rejected'
-- =====================================================

-- Drop existing officer policy if any
DROP POLICY IF EXISTS "Officers can update guild submissions" ON loot_submissions;
DROP POLICY IF EXISTS "Officers can update submissions" ON loot_submissions;

-- Create policy for officers to update submissions in their guild
CREATE POLICY "Officers can update guild submissions" ON loot_submissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = loot_submissions.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('officer', 'guild_master')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = loot_submissions.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('officer', 'guild_master')
    )
  );

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Officers can now approve/reject submissions!';
  RAISE NOTICE '========================================';
END $$;

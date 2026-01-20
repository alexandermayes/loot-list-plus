-- =====================================================
-- FIX: Update RLS policies for loot_submissions
-- =====================================================
-- Update policies to work with character system
-- =====================================================

BEGIN;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view submissions in their guild" ON loot_submissions;
DROP POLICY IF EXISTS "Users can insert their own submissions" ON loot_submissions;
DROP POLICY IF EXISTS "Users can insert character submissions" ON loot_submissions;
DROP POLICY IF EXISTS "Users can update their own pending submissions" ON loot_submissions;
DROP POLICY IF EXISTS "Users can update character pending submissions" ON loot_submissions;
DROP POLICY IF EXISTS "Users can delete their own pending submissions" ON loot_submissions;
DROP POLICY IF EXISTS "Users can delete character pending submissions" ON loot_submissions;
DROP POLICY IF EXISTS "Officers can approve/reject submissions" ON loot_submissions;

-- Enable RLS
ALTER TABLE loot_submissions ENABLE ROW LEVEL SECURITY;

-- Allow users to view submissions for their own characters
CREATE POLICY "Users can view own character submissions" ON loot_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM characters c
      WHERE c.id = loot_submissions.character_id
      AND c.user_id = auth.uid()
    )
  );

-- Allow guild members to view submissions in their guild
CREATE POLICY "Guild members can view guild submissions" ON loot_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      INNER JOIN characters c ON c.id = cgm.character_id
      WHERE c.user_id = auth.uid()
      AND cgm.guild_id = loot_submissions.guild_id
    )
  );

-- Allow users to insert submissions for their own characters
CREATE POLICY "Users can insert character submissions" ON loot_submissions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters c
      WHERE c.id = loot_submissions.character_id
      AND c.user_id = auth.uid()
    )
  );

-- Allow users to update their own character's draft/pending submissions
CREATE POLICY "Users can update character submissions" ON loot_submissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM characters c
      WHERE c.id = loot_submissions.character_id
      AND c.user_id = auth.uid()
    )
    AND status IN ('draft', 'pending')
  );

-- Allow users to delete their own character's draft/pending submissions
CREATE POLICY "Users can delete character submissions" ON loot_submissions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM characters c
      WHERE c.id = loot_submissions.character_id
      AND c.user_id = auth.uid()
    )
    AND status IN ('draft', 'pending')
  );

-- Allow officers to approve/reject submissions in their guild
CREATE POLICY "Officers can manage submissions" ON loot_submissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      INNER JOIN characters c ON c.id = cgm.character_id
      INNER JOIN guild_roles gr ON gr.guild_id = cgm.guild_id AND gr.name = cgm.role
      WHERE c.user_id = auth.uid()
      AND cgm.guild_id = loot_submissions.guild_id
      AND gr.position >= 50
    )
  );

COMMIT;

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Loot Submissions RLS Fixed!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Users can now view/edit their character submissions.';
  RAISE NOTICE 'Officers can approve/reject submissions.';
  RAISE NOTICE '========================================';
END $$;

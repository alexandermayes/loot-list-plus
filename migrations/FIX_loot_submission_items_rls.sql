-- =====================================================
-- FIX: Update RLS policies for loot_submission_items
-- =====================================================
-- Allow users to insert items for their character's submissions
-- =====================================================

BEGIN;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own submission items" ON loot_submission_items;
DROP POLICY IF EXISTS "Users can insert own submission items" ON loot_submission_items;
DROP POLICY IF EXISTS "Users can update own submission items" ON loot_submission_items;
DROP POLICY IF EXISTS "Users can delete own submission items" ON loot_submission_items;
DROP POLICY IF EXISTS "Guild members can view submission items" ON loot_submission_items;

-- Enable RLS
ALTER TABLE loot_submission_items ENABLE ROW LEVEL SECURITY;

-- Allow users to view items for submissions in their guild
CREATE POLICY "Guild members can view submission items" ON loot_submission_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM loot_submissions ls
      WHERE ls.id = loot_submission_items.submission_id
      AND EXISTS (
        SELECT 1 FROM character_guild_memberships cgm
        INNER JOIN characters c ON c.id = cgm.character_id
        WHERE c.user_id = auth.uid()
        AND cgm.guild_id = ls.guild_id
      )
    )
  );

-- Allow users to insert items for their own character's submissions
CREATE POLICY "Users can insert own submission items" ON loot_submission_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loot_submissions ls
      INNER JOIN characters c ON c.id = ls.character_id
      WHERE ls.id = loot_submission_items.submission_id
      AND c.user_id = auth.uid()
    )
  );

-- Allow users to update items for their own character's pending submissions
CREATE POLICY "Users can update own submission items" ON loot_submission_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM loot_submissions ls
      INNER JOIN characters c ON c.id = ls.character_id
      WHERE ls.id = loot_submission_items.submission_id
      AND c.user_id = auth.uid()
      AND ls.status = 'pending'
    )
  );

-- Allow users to delete items from their own character's pending submissions
CREATE POLICY "Users can delete own submission items" ON loot_submission_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM loot_submissions ls
      INNER JOIN characters c ON c.id = ls.character_id
      WHERE ls.id = loot_submission_items.submission_id
      AND c.user_id = auth.uid()
      AND ls.status = 'pending'
    )
  );

COMMIT;

-- Confirmation message
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Loot Submission Items RLS Fixed!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Users can now submit loot list items.';
  RAISE NOTICE 'Refresh browser to submit loot lists.';
  RAISE NOTICE '========================================';
END $$;

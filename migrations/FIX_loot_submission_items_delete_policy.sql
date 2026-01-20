-- =====================================================
-- FIX: Allow users to delete items from draft submissions
-- =====================================================
-- The previous policy only allowed deletion from 'pending' status
-- But users also need to delete from 'draft' status
-- =====================================================

BEGIN;

-- Drop and recreate DELETE policy to allow draft AND pending
DROP POLICY IF EXISTS "Users can delete own submission items" ON loot_submission_items;

CREATE POLICY "Users can delete own submission items" ON loot_submission_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM loot_submissions ls
      INNER JOIN characters c ON c.id = ls.character_id
      WHERE ls.id = loot_submission_items.submission_id
      AND c.user_id = auth.uid()
      AND ls.status IN ('draft', 'pending')
    )
  );

-- Also update UPDATE policy to allow draft submissions
DROP POLICY IF EXISTS "Users can update own submission items" ON loot_submission_items;

CREATE POLICY "Users can update own submission items" ON loot_submission_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM loot_submissions ls
      INNER JOIN characters c ON c.id = ls.character_id
      WHERE ls.id = loot_submission_items.submission_id
      AND c.user_id = auth.uid()
      AND ls.status IN ('draft', 'pending')
    )
  );

COMMIT;

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS Policies Updated!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Users can now delete/update items from';
  RAISE NOTICE 'both draft and pending submissions.';
  RAISE NOTICE '========================================';
END $$;

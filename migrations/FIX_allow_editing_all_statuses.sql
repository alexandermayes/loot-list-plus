-- =====================================================
-- FIX: Allow users to edit submissions at any status
-- =====================================================
-- Users can edit and resubmit approved/rejected lists
-- Resubmitting changes status back to pending
-- =====================================================

BEGIN;

-- Update policy to allow editing at any status
DROP POLICY IF EXISTS "Users can update character submissions" ON loot_submissions;

CREATE POLICY "Users can update character submissions" ON loot_submissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM characters c
      WHERE c.id = loot_submissions.character_id
      AND c.user_id = auth.uid()
    )
    -- Can edit at any status (draft, pending, approved, rejected)
  );

-- Update policy to allow editing items at any status
DROP POLICY IF EXISTS "Users can update own submission items" ON loot_submission_items;

CREATE POLICY "Users can update own submission items" ON loot_submission_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM loot_submissions ls
      INNER JOIN characters c ON c.id = ls.character_id
      WHERE ls.id = loot_submission_items.submission_id
      AND c.user_id = auth.uid()
      -- No status restriction - can edit at any time
    )
  );

-- Update policy to allow deleting items at any status (for clearing/editing)
DROP POLICY IF EXISTS "Users can delete own submission items" ON loot_submission_items;

CREATE POLICY "Users can delete own submission items" ON loot_submission_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM loot_submissions ls
      INNER JOIN characters c ON c.id = ls.character_id
      WHERE ls.id = loot_submission_items.submission_id
      AND c.user_id = auth.uid()
      -- No status restriction - can clear items at any time
    )
  );

COMMIT;

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Edit Policies Updated!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Users can now edit and resubmit lists';
  RAISE NOTICE 'at any status (draft/pending/approved/rejected).';
  RAISE NOTICE 'Resubmitting changes status back to pending.';
  RAISE NOTICE '========================================';
END $$;

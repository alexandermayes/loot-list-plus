-- =====================================================
-- FIX: Allow users to update submissions with any status
-- =====================================================
-- The previous policy only allowed updating submissions with
-- 'draft' or 'pending' status. This prevented users from
-- editing their loot list after it was approved.
--
-- With this fix, users can always edit their own submissions,
-- which allows them to revise their loot list at any time.
-- The status will be reset to 'draft' when they make changes.
-- =====================================================

BEGIN;

-- Drop the restrictive update policy
DROP POLICY IF EXISTS "Users can update character submissions" ON loot_submissions;
DROP POLICY IF EXISTS "Users can update their character submissions" ON loot_submissions;
DROP POLICY IF EXISTS "Users can update character pending submissions" ON loot_submissions;

-- Create a more permissive policy - users can update their own submissions regardless of status
CREATE POLICY "Users can update character submissions" ON loot_submissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM characters c
      WHERE c.id = loot_submissions.character_id
      AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters c
      WHERE c.id = loot_submissions.character_id
      AND c.user_id = auth.uid()
    )
  );

-- Also fix the loot_submission_items UPDATE policy to allow any status
-- (The DELETE policy already has no status restriction)
-- The UPDATE policy currently restricts to ('draft', 'needs_revision')
DROP POLICY IF EXISTS "Users can update items in their character submissions" ON loot_submission_items;

-- Allow update regardless of submission status
CREATE POLICY "Users can update items in their character submissions" ON loot_submission_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM loot_submissions ls
      INNER JOIN characters c ON c.id = ls.character_id
      WHERE ls.id = loot_submission_items.submission_id
      AND c.user_id = auth.uid()
    )
  );

COMMIT;

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Loot Submissions RLS Fixed!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Users can now update/edit their submissions';
  RAISE NOTICE 'regardless of current status (draft/pending/approved).';
  RAISE NOTICE 'Refresh browser to test loot list editing.';
  RAISE NOTICE '========================================';
END $$;

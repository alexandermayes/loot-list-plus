-- =====================================================
-- FIX: Users can only delete draft submissions
-- =====================================================
-- Once submitted, only officers can delete
-- =====================================================

BEGIN;

-- Update user delete policy to only allow drafts
DROP POLICY IF EXISTS "Users can delete character submissions" ON loot_submissions;

CREATE POLICY "Users can delete character submissions" ON loot_submissions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM characters c
      WHERE c.id = loot_submissions.character_id
      AND c.user_id = auth.uid()
    )
    AND status = 'draft'  -- Only drafts can be deleted by users
  );

COMMIT;

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'User Delete Policy Updated!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Users can only delete draft submissions.';
  RAISE NOTICE 'Submitted lists require officer approval to delete.';
  RAISE NOTICE '========================================';
END $$;

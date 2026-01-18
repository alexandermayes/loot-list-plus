-- Comprehensive fix for loot submission policies
-- Allows users to update/resubmit their loot lists regardless of status

-- Fix loot_submissions UPDATE policy
DROP POLICY IF EXISTS "Users can update character pending submissions" ON loot_submissions;
DROP POLICY IF EXISTS "Users can update their character submissions" ON loot_submissions;

CREATE POLICY "Users can update their character submissions" ON loot_submissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = loot_submissions.character_id
      AND characters.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = loot_submissions.character_id
      AND characters.user_id = auth.uid()
    )
  );

-- Fix loot_submission_items UPDATE policy (allow updates regardless of submission status)
DROP POLICY IF EXISTS "Users can update items in their character submissions" ON loot_submission_items;

CREATE POLICY "Users can update items in their character submissions" ON loot_submission_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM loot_submissions ls
      INNER JOIN characters c ON c.id = ls.character_id
      WHERE ls.id = loot_submission_items.submission_id
      AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loot_submissions ls
      INNER JOIN characters c ON c.id = ls.character_id
      WHERE ls.id = loot_submission_items.submission_id
      AND c.user_id = auth.uid()
    )
  );

-- Verify policies exist
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual AS using_clause,
  with_check AS with_check_clause
FROM pg_policies
WHERE tablename IN ('loot_submissions', 'loot_submission_items')
AND cmd IN ('UPDATE', 'DELETE', 'INSERT')
ORDER BY tablename, cmd;

-- Fix loot_submissions UPDATE policy to allow users to update their own submissions
-- regardless of status (draft, pending, or approved)

DROP POLICY IF EXISTS "Users can update character pending submissions" ON loot_submissions;

CREATE POLICY "Users can update their character submissions" ON loot_submissions
  FOR UPDATE
  USING (
    -- User owns the character
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = loot_submissions.character_id
      AND characters.user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- User owns the character
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = loot_submissions.character_id
      AND characters.user_id = auth.uid()
    )
  );

-- Verify the policy exists
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'loot_submissions'
AND cmd = 'UPDATE';

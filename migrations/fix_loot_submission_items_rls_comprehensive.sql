-- =====================================================
-- FIX: Comprehensive loot_submission_items RLS cleanup
-- =====================================================
-- Multiple migrations have created conflicting policies.
-- This migration drops ALL policies and creates fresh ones
-- that work correctly for all submission statuses.
-- =====================================================

BEGIN;

-- Drop ALL existing policies on loot_submission_items (from various migrations)
DROP POLICY IF EXISTS "Users can insert submission items" ON loot_submission_items;
DROP POLICY IF EXISTS "Users can update submission items" ON loot_submission_items;
DROP POLICY IF EXISTS "Users can delete submission items" ON loot_submission_items;
DROP POLICY IF EXISTS "Users can view submission items" ON loot_submission_items;
DROP POLICY IF EXISTS "Users can delete own submission items" ON loot_submission_items;
DROP POLICY IF EXISTS "Users can update own submission items" ON loot_submission_items;
DROP POLICY IF EXISTS "Users can update items in their character submissions" ON loot_submission_items;
DROP POLICY IF EXISTS "Guild members can view submission items" ON loot_submission_items;

-- Policy 1: Users can SELECT items for submissions in guilds they belong to
CREATE POLICY "Guild members can view submission items" ON loot_submission_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM loot_submissions ls
      INNER JOIN character_guild_memberships cgm ON cgm.guild_id = ls.guild_id
      INNER JOIN characters c ON c.id = cgm.character_id
      WHERE ls.id = loot_submission_items.submission_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
    )
  );

-- Policy 2: Users can INSERT items for their own character's submissions (any status)
CREATE POLICY "Users can insert submission items" ON loot_submission_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loot_submissions ls
      INNER JOIN characters c ON c.id = ls.character_id
      WHERE ls.id = loot_submission_items.submission_id
      AND c.user_id = auth.uid()
    )
  );

-- Policy 3: Users can UPDATE items for their own character's submissions (any status)
CREATE POLICY "Users can update submission items" ON loot_submission_items
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

-- Policy 4: Users can DELETE items for their own character's submissions (any status)
-- No status restriction - users should always be able to edit their lists
CREATE POLICY "Users can delete submission items" ON loot_submission_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM loot_submissions ls
      INNER JOIN characters c ON c.id = ls.character_id
      WHERE ls.id = loot_submission_items.submission_id
      AND c.user_id = auth.uid()
    )
  );

COMMIT;

-- Verification: Show all policies on loot_submission_items
SELECT
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'loot_submission_items'
ORDER BY cmd;

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'loot_submission_items RLS Fixed!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'All conflicting policies removed.';
  RAISE NOTICE 'Users can now edit submissions';
  RAISE NOTICE 'regardless of status.';
  RAISE NOTICE '========================================';
END $$;

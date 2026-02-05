-- =====================================================
-- FIX: loot_submission_items RLS policies v2
-- =====================================================
-- Ensure users can insert/update/delete items for their
-- own character's submissions
-- =====================================================

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can insert submission items" ON loot_submission_items;
DROP POLICY IF EXISTS "Users can update submission items" ON loot_submission_items;
DROP POLICY IF EXISTS "Users can delete submission items" ON loot_submission_items;
DROP POLICY IF EXISTS "Users can view submission items" ON loot_submission_items;
DROP POLICY IF EXISTS "Users can delete own submission items" ON loot_submission_items;
DROP POLICY IF EXISTS "Users can update own submission items" ON loot_submission_items;
DROP POLICY IF EXISTS "Users can update items in their character submissions" ON loot_submission_items;
DROP POLICY IF EXISTS "Guild members can view submission items" ON loot_submission_items;
DROP POLICY IF EXISTS "loot_submission_items_select" ON loot_submission_items;
DROP POLICY IF EXISTS "loot_submission_items_insert" ON loot_submission_items;
DROP POLICY IF EXISTS "loot_submission_items_update" ON loot_submission_items;
DROP POLICY IF EXISTS "loot_submission_items_delete" ON loot_submission_items;

-- Enable RLS (in case it's not enabled)
ALTER TABLE loot_submission_items ENABLE ROW LEVEL SECURITY;

-- Policy 1: SELECT - Guild members can view items for submissions in their guild
CREATE POLICY "loot_submission_items_select" ON loot_submission_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM loot_submissions ls
      JOIN character_guild_memberships cgm ON cgm.guild_id = ls.guild_id AND cgm.is_active = true
      JOIN characters c ON c.id = cgm.character_id AND c.user_id = auth.uid()
      WHERE ls.id = loot_submission_items.submission_id
    )
  );

-- Policy 2: INSERT - Users can insert items for their own character's submissions
CREATE POLICY "loot_submission_items_insert" ON loot_submission_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loot_submissions ls
      JOIN characters c ON c.id = ls.character_id AND c.user_id = auth.uid()
      WHERE ls.id = submission_id
    )
  );

-- Policy 3: UPDATE - Users can update items for their own character's submissions
CREATE POLICY "loot_submission_items_update" ON loot_submission_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM loot_submissions ls
      JOIN characters c ON c.id = ls.character_id AND c.user_id = auth.uid()
      WHERE ls.id = submission_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loot_submissions ls
      JOIN characters c ON c.id = ls.character_id AND c.user_id = auth.uid()
      WHERE ls.id = submission_id
    )
  );

-- Policy 4: DELETE - Users can delete items for their own character's submissions
CREATE POLICY "loot_submission_items_delete" ON loot_submission_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM loot_submissions ls
      JOIN characters c ON c.id = ls.character_id AND c.user_id = auth.uid()
      WHERE ls.id = submission_id
    )
  );

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'loot_submission_items RLS policies fixed!';
  RAISE NOTICE '========================================';
END $$;

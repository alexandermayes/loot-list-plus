-- =====================================================
-- Comprehensive fix for all loot submission RLS
-- =====================================================

-- =====================================================
-- PART 1: Fix loot_submissions policies
-- =====================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view character submissions" ON loot_submissions;
DROP POLICY IF EXISTS "Users can insert character submissions" ON loot_submissions;
DROP POLICY IF EXISTS "Users can update character submissions" ON loot_submissions;
DROP POLICY IF EXISTS "Users can delete character submissions" ON loot_submissions;
DROP POLICY IF EXISTS "Officers can update guild submissions" ON loot_submissions;
DROP POLICY IF EXISTS "Officers can update submissions" ON loot_submissions;
DROP POLICY IF EXISTS "Guild members can view submissions" ON loot_submissions;
DROP POLICY IF EXISTS "loot_submissions_select" ON loot_submissions;
DROP POLICY IF EXISTS "loot_submissions_insert" ON loot_submissions;
DROP POLICY IF EXISTS "loot_submissions_update" ON loot_submissions;
DROP POLICY IF EXISTS "loot_submissions_delete" ON loot_submissions;

-- Enable RLS
ALTER TABLE loot_submissions ENABLE ROW LEVEL SECURITY;

-- SELECT: Guild members can view all submissions in their guild
CREATE POLICY "loot_submissions_select" ON loot_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = loot_submissions.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
    )
  );

-- INSERT: Users can create submissions for their own characters
CREATE POLICY "loot_submissions_insert" ON loot_submissions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters c
      WHERE c.id = character_id
      AND c.user_id = auth.uid()
    )
  );

-- UPDATE: Users can update their own submissions OR officers can update any in their guild
CREATE POLICY "loot_submissions_update" ON loot_submissions
  FOR UPDATE
  USING (
    -- User owns the character
    EXISTS (
      SELECT 1 FROM characters c
      WHERE c.id = loot_submissions.character_id
      AND c.user_id = auth.uid()
    )
    OR
    -- User is an officer in the guild
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = loot_submissions.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('officer', 'guild_master')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters c
      WHERE c.id = loot_submissions.character_id
      AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = loot_submissions.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('officer', 'guild_master')
    )
  );

-- DELETE: Users can delete their own submissions
CREATE POLICY "loot_submissions_delete" ON loot_submissions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM characters c
      WHERE c.id = loot_submissions.character_id
      AND c.user_id = auth.uid()
    )
  );

-- =====================================================
-- PART 2: Fix loot_submission_items policies
-- =====================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "loot_submission_items_select" ON loot_submission_items;
DROP POLICY IF EXISTS "loot_submission_items_insert" ON loot_submission_items;
DROP POLICY IF EXISTS "loot_submission_items_update" ON loot_submission_items;
DROP POLICY IF EXISTS "loot_submission_items_delete" ON loot_submission_items;
DROP POLICY IF EXISTS "Users can insert submission items" ON loot_submission_items;
DROP POLICY IF EXISTS "Users can update submission items" ON loot_submission_items;
DROP POLICY IF EXISTS "Users can delete submission items" ON loot_submission_items;
DROP POLICY IF EXISTS "Guild members can view submission items" ON loot_submission_items;

-- Enable RLS
ALTER TABLE loot_submission_items ENABLE ROW LEVEL SECURITY;

-- SELECT: Guild members can view items for submissions in their guild
CREATE POLICY "loot_submission_items_select" ON loot_submission_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM loot_submissions ls
      JOIN character_guild_memberships cgm ON cgm.guild_id = ls.guild_id
      JOIN characters c ON c.id = cgm.character_id
      WHERE ls.id = loot_submission_items.submission_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
    )
  );

-- INSERT: Users can insert items for their own character's submissions
CREATE POLICY "loot_submission_items_insert" ON loot_submission_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loot_submissions ls
      JOIN characters c ON c.id = ls.character_id
      WHERE ls.id = submission_id
      AND c.user_id = auth.uid()
    )
  );

-- UPDATE: Users can update items for their own character's submissions
CREATE POLICY "loot_submission_items_update" ON loot_submission_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM loot_submissions ls
      JOIN characters c ON c.id = ls.character_id
      WHERE ls.id = submission_id
      AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loot_submissions ls
      JOIN characters c ON c.id = ls.character_id
      WHERE ls.id = submission_id
      AND c.user_id = auth.uid()
    )
  );

-- DELETE: Users can delete items for their own character's submissions
CREATE POLICY "loot_submission_items_delete" ON loot_submission_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM loot_submissions ls
      JOIN characters c ON c.id = ls.character_id
      WHERE ls.id = submission_id
      AND c.user_id = auth.uid()
    )
  );

-- =====================================================
-- PART 3: Ensure unique constraint exists for items upsert
-- =====================================================
DO $$
BEGIN
  -- Add unique constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'loot_submission_items_unique_submission_rank_slot'
  ) THEN
    ALTER TABLE loot_submission_items
    ADD CONSTRAINT loot_submission_items_unique_submission_rank_slot
    UNIQUE (submission_id, rank, slot);
  END IF;
END $$;

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'All loot submission RLS policies fixed!';
  RAISE NOTICE '- Users can manage their own submissions';
  RAISE NOTICE '- Officers can approve/reject submissions';
  RAISE NOTICE '- Items have unique constraint for upsert';
  RAISE NOTICE '========================================';
END $$;

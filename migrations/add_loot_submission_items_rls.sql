-- Migration: Add RLS policies for loot_submission_items
-- This allows users to manage items in their own loot submissions

-- Enable RLS if not already enabled
ALTER TABLE loot_submission_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view items in their guild submissions" ON loot_submission_items;
DROP POLICY IF EXISTS "Users can insert items in their character submissions" ON loot_submission_items;
DROP POLICY IF EXISTS "Users can update items in their character submissions" ON loot_submission_items;
DROP POLICY IF EXISTS "Users can delete items in their character submissions" ON loot_submission_items;
DROP POLICY IF EXISTS "Officers can manage all submission items" ON loot_submission_items;

-- Policy: Users can view items in submissions from their guild
CREATE POLICY "Users can view items in their guild submissions" ON loot_submission_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM loot_submissions ls
      INNER JOIN character_guild_memberships cgm ON cgm.guild_id = ls.guild_id
      INNER JOIN characters c ON c.id = cgm.character_id
      WHERE ls.id = loot_submission_items.submission_id
      AND c.user_id = auth.uid()
    )
  );

-- Policy: Users can insert items in their own character's submissions
CREATE POLICY "Users can insert items in their character submissions" ON loot_submission_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loot_submissions ls
      INNER JOIN characters c ON c.id = ls.character_id
      WHERE ls.id = loot_submission_items.submission_id
      AND c.user_id = auth.uid()
    )
  );

-- Policy: Users can update items in their own character's submissions (only if not submitted or needs revision)
CREATE POLICY "Users can update items in their character submissions" ON loot_submission_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM loot_submissions ls
      INNER JOIN characters c ON c.id = ls.character_id
      WHERE ls.id = loot_submission_items.submission_id
      AND c.user_id = auth.uid()
      AND ls.status IN ('draft', 'needs_revision')
    )
  );

-- Policy: Users can delete items in their own character's submissions
-- Note: DELETE doesn't check status to allow clearing items before re-inserting during auto-save
-- The submission status check should happen at the application level
CREATE POLICY "Users can delete items in their character submissions" ON loot_submission_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM loot_submissions ls
      INNER JOIN characters c ON c.id = ls.character_id
      WHERE ls.id = loot_submission_items.submission_id
      AND c.user_id = auth.uid()
    )
  );

-- Policy: Officers can manage all submission items in their guild
CREATE POLICY "Officers can manage all submission items" ON loot_submission_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM loot_submissions ls
      INNER JOIN character_guild_memberships cgm ON cgm.guild_id = ls.guild_id
      INNER JOIN characters c ON c.id = cgm.character_id
      WHERE ls.id = loot_submission_items.submission_id
      AND c.user_id = auth.uid()
      AND cgm.role IN ('Officer', 'Guild Master')
    )
  );

-- Fix RLS policies for loot_submission_items to work with character system

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert submission items" ON loot_submission_items;
DROP POLICY IF EXISTS "Users can update submission items" ON loot_submission_items;
DROP POLICY IF EXISTS "Users can delete submission items" ON loot_submission_items;
DROP POLICY IF EXISTS "Users can view submission items" ON loot_submission_items;

-- Create new policies for character-based system
-- Users can insert items for their own character's submissions
CREATE POLICY "Users can insert submission items" ON loot_submission_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM loot_submissions ls
      INNER JOIN characters c ON c.id = ls.character_id
      WHERE ls.id = loot_submission_items.submission_id
      AND c.user_id = auth.uid()
    )
  );

-- Users can update items for their own character's submissions
CREATE POLICY "Users can update submission items" ON loot_submission_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM loot_submissions ls
      INNER JOIN characters c ON c.id = ls.character_id
      WHERE ls.id = loot_submission_items.submission_id
      AND c.user_id = auth.uid()
    )
  );

-- Users can delete items for their own character's submissions
CREATE POLICY "Users can delete submission items" ON loot_submission_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM loot_submissions ls
      INNER JOIN characters c ON c.id = ls.character_id
      WHERE ls.id = loot_submission_items.submission_id
      AND c.user_id = auth.uid()
    )
  );

-- Users can view items for submissions in their guilds
CREATE POLICY "Users can view submission items" ON loot_submission_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM loot_submissions ls
      INNER JOIN character_guild_memberships cgm ON cgm.guild_id = ls.guild_id
      INNER JOIN characters c ON c.id = cgm.character_id
      WHERE ls.id = loot_submission_items.submission_id
      AND c.user_id = auth.uid()
    )
  );

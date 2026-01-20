-- Add DELETE policies for loot_submissions and loot_submission_items

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can delete their own character submissions" ON loot_submissions;
DROP POLICY IF EXISTS "Officers can delete guild submissions" ON loot_submissions;
DROP POLICY IF EXISTS "Users can delete items in their character submissions" ON loot_submission_items;
DROP POLICY IF EXISTS "Officers can delete guild submission items" ON loot_submission_items;

-- Allow users to delete their own character submissions
CREATE POLICY "Users can delete their own character submissions" ON loot_submissions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = loot_submissions.character_id
      AND characters.user_id = auth.uid()
    )
  );

-- Allow officers to delete any submission in their guild
CREATE POLICY "Officers can delete guild submissions" ON loot_submissions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      INNER JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = loot_submissions.guild_id
      AND c.user_id = auth.uid()
      AND cgm.role IN ('Officer', 'Guild Master')
    )
  );

-- Allow users to delete items in their own submissions
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

-- Allow officers to delete submission items in their guild
CREATE POLICY "Officers can delete guild submission items" ON loot_submission_items
  FOR DELETE
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

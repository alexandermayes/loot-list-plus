-- Fix RLS policies for loot_item_classes to allow officers to modify items
-- in ANY expansion their guild has, not just the currently active one.
--
-- This ensures that when switching between expansions, item classifications
-- are preserved and officers can still manage loot settings for past expansions.

-- Drop existing policies
DROP POLICY IF EXISTS "Officers can insert loot item classes" ON loot_item_classes;
DROP POLICY IF EXISTS "Officers can delete loot item classes" ON loot_item_classes;

-- Create INSERT policy for officers - allows inserting for ANY guild expansion
CREATE POLICY "Officers can insert loot item classes" ON loot_item_classes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM loot_items li
      INNER JOIN raid_tiers rt ON rt.id = li.raid_tier_id
      INNER JOIN expansions e ON e.id = rt.expansion_id
      INNER JOIN characters c ON c.user_id = auth.uid()
      INNER JOIN character_guild_memberships cgm ON cgm.character_id = c.id AND cgm.guild_id = e.guild_id
      WHERE li.id = loot_item_classes.loot_item_id
      AND cgm.role IN ('Officer', 'Guild Master')
      AND cgm.is_active = true
    )
  );

-- Create DELETE policy for officers - allows deleting for ANY guild expansion
CREATE POLICY "Officers can delete loot item classes" ON loot_item_classes
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM loot_items li
      INNER JOIN raid_tiers rt ON rt.id = li.raid_tier_id
      INNER JOIN expansions e ON e.id = rt.expansion_id
      INNER JOIN characters c ON c.user_id = auth.uid()
      INNER JOIN character_guild_memberships cgm ON cgm.character_id = c.id AND cgm.guild_id = e.guild_id
      WHERE li.id = loot_item_classes.loot_item_id
      AND cgm.role IN ('Officer', 'Guild Master')
      AND cgm.is_active = true
    )
  );

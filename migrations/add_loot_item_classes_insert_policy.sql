-- Add INSERT policy for loot_item_classes table
-- Allow officers to add specs to loot items in their guild

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Officers can insert loot item classes" ON loot_item_classes;

-- Create INSERT policy for officers using the new character system
CREATE POLICY "Officers can insert loot item classes" ON loot_item_classes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM loot_items li
      INNER JOIN raid_tiers rt ON rt.id = li.raid_tier_id
      INNER JOIN expansions e ON e.id = rt.expansion_id
      INNER JOIN guilds g ON g.active_expansion_id = e.id
      INNER JOIN characters c ON c.user_id = auth.uid()
      INNER JOIN character_guild_memberships cgm ON cgm.character_id = c.id AND cgm.guild_id = g.id
      WHERE li.id = loot_item_classes.loot_item_id
      AND cgm.role IN ('Officer', 'Guild Master')
    )
  );

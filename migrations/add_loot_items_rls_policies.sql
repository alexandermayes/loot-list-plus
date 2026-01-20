-- Enable RLS on loot_items table
ALTER TABLE loot_items ENABLE ROW LEVEL SECURITY;

-- Officers can manage loot items (insert, update, delete)
CREATE POLICY "Officers can manage loot items"
ON loot_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM raid_tiers rt
    JOIN expansions e ON rt.expansion_id = e.id
    JOIN guild_members gm ON e.guild_id = gm.guild_id
    WHERE rt.id = loot_items.raid_tier_id
    AND gm.user_id = auth.uid()
    AND gm.role IN ('Officer', 'Guild Master')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM raid_tiers rt
    JOIN expansions e ON rt.expansion_id = e.id
    JOIN guild_members gm ON e.guild_id = gm.guild_id
    WHERE rt.id = loot_items.raid_tier_id
    AND gm.user_id = auth.uid()
    AND gm.role IN ('Officer', 'Guild Master')
  )
);

-- Members can view loot items in their guild
CREATE POLICY "Members can view loot items"
ON loot_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM raid_tiers rt
    JOIN expansions e ON rt.expansion_id = e.id
    JOIN guild_members gm ON e.guild_id = gm.guild_id
    WHERE rt.id = loot_items.raid_tier_id
    AND gm.user_id = auth.uid()
  )
);

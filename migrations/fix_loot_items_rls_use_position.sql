-- Drop existing policies
DROP POLICY IF EXISTS "Officers can manage loot items" ON loot_items;
DROP POLICY IF EXISTS "Members can view loot items" ON loot_items;

-- Officers can manage loot items (using position >= 50 instead of hardcoded role names)
CREATE POLICY "Officers can manage loot items"
ON loot_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM raid_tiers rt
    JOIN expansions e ON rt.expansion_id = e.id
    JOIN guild_members gm ON e.guild_id = gm.guild_id
    JOIN guild_roles gr ON gm.role = gr.name AND gr.guild_id = e.guild_id
    WHERE rt.id = loot_items.raid_tier_id
    AND gm.user_id = auth.uid()
    AND gr.position >= 50  -- Officer level and above
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM raid_tiers rt
    JOIN expansions e ON rt.expansion_id = e.id
    JOIN guild_members gm ON e.guild_id = gm.guild_id
    JOIN guild_roles gr ON gm.role = gr.name AND gr.guild_id = e.guild_id
    WHERE rt.id = loot_items.raid_tier_id
    AND gm.user_id = auth.uid()
    AND gr.position >= 50  -- Officer level and above
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

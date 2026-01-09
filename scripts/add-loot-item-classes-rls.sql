-- Row Level Security Policies for loot_item_classes
-- This table manages which classes/specs can use which loot items

-- Enable RLS on loot_item_classes
ALTER TABLE loot_item_classes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Officers can manage loot item classes" ON loot_item_classes;
DROP POLICY IF EXISTS "Members can view loot item classes" ON loot_item_classes;

-- Policy: Allow officers to do all operations on loot_item_classes for their guild's items
CREATE POLICY "Officers can manage loot item classes"
ON loot_item_classes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM loot_items li
    JOIN raid_tiers rt ON li.raid_tier_id = rt.id
    JOIN expansions e ON rt.expansion_id = e.id
    JOIN guild_members gm ON e.guild_id = gm.guild_id
    WHERE li.id = loot_item_classes.loot_item_id
    AND gm.user_id = auth.uid()
    AND gm.role = 'Officer'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM loot_items li
    JOIN raid_tiers rt ON li.raid_tier_id = rt.id
    JOIN expansions e ON rt.expansion_id = e.id
    JOIN guild_members gm ON e.guild_id = gm.guild_id
    WHERE li.id = loot_item_classes.loot_item_id
    AND gm.user_id = auth.uid()
    AND gm.role = 'Officer'
  )
);

-- Policy: Allow all guild members to view loot item classes
CREATE POLICY "Members can view loot item classes"
ON loot_item_classes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM loot_items li
    JOIN raid_tiers rt ON li.raid_tier_id = rt.id
    JOIN expansions e ON rt.expansion_id = e.id
    JOIN guild_members gm ON e.guild_id = gm.guild_id
    WHERE li.id = loot_item_classes.loot_item_id
    AND gm.user_id = auth.uid()
  )
);

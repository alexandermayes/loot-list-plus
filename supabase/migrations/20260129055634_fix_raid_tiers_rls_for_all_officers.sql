-- Fix RLS policies for raid_tiers to check role position instead of hardcoded role name
-- This allows Guild Master (position 100) and Officer (position 50) to update raid tiers

-- Drop existing update policy
DROP POLICY IF EXISTS "Officers can update raid tiers" ON raid_tiers;

-- Create new policy that checks role position >= 50 (Officer or higher)
CREATE POLICY "Officers can update raid tiers"
ON raid_tiers
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM expansions e
    JOIN guild_members gm ON e.guild_id = gm.guild_id
    JOIN guild_roles gr ON gr.guild_id = gm.guild_id AND gr.name = gm.role
    WHERE e.id = raid_tiers.expansion_id
    AND gm.user_id = auth.uid()
    AND gr.position >= 50
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM expansions e
    JOIN guild_members gm ON e.guild_id = gm.guild_id
    JOIN guild_roles gr ON gr.guild_id = gm.guild_id AND gr.name = gm.role
    WHERE e.id = raid_tiers.expansion_id
    AND gm.user_id = auth.uid()
    AND gr.position >= 50
  )
);

-- Also fix the other raid_tiers policies for consistency

-- Fix SELECT policy
DROP POLICY IF EXISTS "Officers can view raid tiers for their guild" ON raid_tiers;
CREATE POLICY "Members can view raid tiers for their guild"
ON raid_tiers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM expansions e
    JOIN guild_members gm ON e.guild_id = gm.guild_id
    WHERE e.id = raid_tiers.expansion_id
    AND gm.user_id = auth.uid()
  )
);

-- Fix INSERT policy
DROP POLICY IF EXISTS "Officers can insert raid tiers" ON raid_tiers;
CREATE POLICY "Officers can insert raid tiers"
ON raid_tiers
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM expansions e
    JOIN guild_members gm ON e.guild_id = gm.guild_id
    JOIN guild_roles gr ON gr.guild_id = gm.guild_id AND gr.name = gm.role
    WHERE e.id = raid_tiers.expansion_id
    AND gm.user_id = auth.uid()
    AND gr.position >= 50
  )
);

-- Fix DELETE policy
DROP POLICY IF EXISTS "Officers can delete raid tiers" ON raid_tiers;
CREATE POLICY "Officers can delete raid tiers"
ON raid_tiers
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM expansions e
    JOIN guild_members gm ON e.guild_id = gm.guild_id
    JOIN guild_roles gr ON gr.guild_id = gm.guild_id AND gr.name = gm.role
    WHERE e.id = raid_tiers.expansion_id
    AND gm.user_id = auth.uid()
    AND gr.position >= 50
  )
);

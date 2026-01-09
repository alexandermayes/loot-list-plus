-- Row Level Security Policies for Raid Tiers
-- Run these in your Supabase SQL Editor

-- First, check if RLS is enabled and drop existing policies if needed
ALTER TABLE raid_tiers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Officers can view raid tiers for their guild" ON raid_tiers;
DROP POLICY IF EXISTS "Officers can insert raid tiers" ON raid_tiers;
DROP POLICY IF EXISTS "Officers can update raid tiers" ON raid_tiers;
DROP POLICY IF EXISTS "Officers can delete raid tiers" ON raid_tiers;
DROP POLICY IF EXISTS "Officers can view guild expansions" ON expansions;
DROP POLICY IF EXISTS "Officers can insert expansions" ON expansions;
DROP POLICY IF EXISTS "Officers can update expansions" ON expansions;

-- Policy: Allow officers to view all raid tiers for their guild's expansions
CREATE POLICY "Officers can view raid tiers for their guild"
ON raid_tiers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM expansions e
    JOIN guild_members gm ON e.guild_id = gm.guild_id
    WHERE e.id = raid_tiers.expansion_id
    AND gm.user_id = auth.uid()
    AND gm.role = 'Officer'
  )
  OR
  EXISTS (
    SELECT 1 FROM expansions e
    JOIN guild_members gm ON e.guild_id = gm.guild_id
    WHERE e.id = raid_tiers.expansion_id
    AND gm.user_id = auth.uid()
  )
);

-- Policy: Allow officers to insert raid tiers for their guild's expansions
CREATE POLICY "Officers can insert raid tiers"
ON raid_tiers
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM expansions e
    JOIN guild_members gm ON e.guild_id = gm.guild_id
    WHERE e.id = raid_tiers.expansion_id
    AND gm.user_id = auth.uid()
    AND gm.role = 'Officer'
  )
);

-- Policy: Allow officers to update raid tiers for their guild's expansions
CREATE POLICY "Officers can update raid tiers"
ON raid_tiers
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM expansions e
    JOIN guild_members gm ON e.guild_id = gm.guild_id
    WHERE e.id = raid_tiers.expansion_id
    AND gm.user_id = auth.uid()
    AND gm.role = 'Officer'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM expansions e
    JOIN guild_members gm ON e.guild_id = gm.guild_id
    WHERE e.id = raid_tiers.expansion_id
    AND gm.user_id = auth.uid()
    AND gm.role = 'Officer'
  )
);

-- Policy: Allow officers to delete raid tiers for their guild's expansions
CREATE POLICY "Officers can delete raid tiers"
ON raid_tiers
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM expansions e
    JOIN guild_members gm ON e.guild_id = gm.guild_id
    WHERE e.id = raid_tiers.expansion_id
    AND gm.user_id = auth.uid()
    AND gm.role = 'Officer'
  )
);

-- Also ensure expansions table has proper RLS policies
-- (If you haven't set these up yet)

-- Allow officers to view expansions for their guild
CREATE POLICY "Officers can view guild expansions"
ON expansions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM guild_members gm
    WHERE gm.guild_id = expansions.guild_id
    AND gm.user_id = auth.uid()
    AND gm.role = 'Officer'
  )
  OR
  EXISTS (
    SELECT 1 FROM guild_members gm
    WHERE gm.guild_id = expansions.guild_id
    AND gm.user_id = auth.uid()
  )
);

-- Allow officers to insert expansions for their guild
CREATE POLICY "Officers can insert expansions"
ON expansions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM guild_members gm
    WHERE gm.guild_id = expansions.guild_id
    AND gm.user_id = auth.uid()
    AND gm.role = 'Officer'
  )
);

-- Allow officers to update expansions for their guild
CREATE POLICY "Officers can update expansions"
ON expansions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM guild_members gm
    WHERE gm.guild_id = expansions.guild_id
    AND gm.user_id = auth.uid()
    AND gm.role = 'Officer'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM guild_members gm
    WHERE gm.guild_id = expansions.guild_id
    AND gm.user_id = auth.uid()
    AND gm.role = 'Officer'
  )
);

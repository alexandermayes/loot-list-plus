-- Fix infinite recursion in guild_members RLS policies
-- The issue: "Officers can manage members" was using FOR ALL which includes SELECT,
-- and it was checking guild_members within guild_members queries

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view guild members" ON guild_members;
DROP POLICY IF EXISTS "Users can join guilds" ON guild_members;
DROP POLICY IF EXISTS "Officers can manage members" ON guild_members;

-- Policy 1: Anyone can SELECT guild members (no recursion)
CREATE POLICY "Users can view guild members"
ON guild_members
FOR SELECT
USING (true);

-- Policy 2: Authenticated users can INSERT themselves as members (for joining guilds)
CREATE POLICY "Users can join guilds"
ON guild_members
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy 3: Officers can UPDATE members (split from SELECT to avoid recursion)
-- We'll use a simpler check for officers - just verify they are an officer
CREATE POLICY "Officers can update members"
ON guild_members
FOR UPDATE
TO authenticated
USING (
  -- Allow if user is officer of this guild
  -- Use a direct query without recursion
  user_id IN (
    SELECT user_id FROM guild_members
    WHERE guild_id = guild_members.guild_id
      AND role = 'Officer'
      AND user_id = auth.uid()
  )
)
WITH CHECK (
  user_id IN (
    SELECT user_id FROM guild_members
    WHERE guild_id = guild_members.guild_id
      AND role = 'Officer'
      AND user_id = auth.uid()
  )
);

-- Policy 4: Officers can DELETE members
CREATE POLICY "Officers can delete members"
ON guild_members
FOR DELETE
TO authenticated
USING (
  auth.uid() IN (
    SELECT user_id FROM guild_members
    WHERE guild_id = guild_members.guild_id
      AND role = 'Officer'
  )
);

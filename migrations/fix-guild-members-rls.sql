-- Enable RLS on guild_members if not already enabled
ALTER TABLE guild_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view guild members" ON guild_members;
DROP POLICY IF EXISTS "Users can join guilds" ON guild_members;
DROP POLICY IF EXISTS "Officers can manage members" ON guild_members;

-- Policy: Users can view all guild members
CREATE POLICY "Users can view guild members"
ON guild_members
FOR SELECT
USING (true);

-- Policy: Authenticated users can insert themselves as members (for joining guilds)
CREATE POLICY "Users can join guilds"
ON guild_members
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Officers can update and delete members in their guild
CREATE POLICY "Officers can manage members"
ON guild_members
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM guild_members AS gm
    WHERE gm.guild_id = guild_members.guild_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'Officer'
  )
);

-- Also ensure user_active_guilds has proper RLS
ALTER TABLE user_active_guilds ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage their own active guild" ON user_active_guilds;

-- Policy: Users can only manage their own active guild
CREATE POLICY "Users can manage their own active guild"
ON user_active_guilds
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

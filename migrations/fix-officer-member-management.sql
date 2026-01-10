-- Fix RLS to allow officers to update/delete members without infinite recursion
-- Solution: Use a simpler approach with a helper function

-- Create a helper function to check if a user is an officer of a guild
CREATE OR REPLACE FUNCTION is_officer_of_guild(user_id_to_check UUID, guild_id_to_check UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM guild_members
    WHERE user_id = user_id_to_check
      AND guild_id = guild_id_to_check
      AND role = 'Officer'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view guild members" ON guild_members;
DROP POLICY IF EXISTS "Users can join guilds" ON guild_members;
DROP POLICY IF EXISTS "Users can update their own member record" ON guild_members;
DROP POLICY IF EXISTS "Officers can update members" ON guild_members;
DROP POLICY IF EXISTS "Officers can delete members" ON guild_members;

-- Policy 1: Anyone can SELECT guild members (needed for app to function)
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

-- Policy 3: Officers can UPDATE members in their guild (using helper function to avoid recursion)
CREATE POLICY "Officers can update members"
ON guild_members
FOR UPDATE
TO authenticated
USING (is_officer_of_guild(auth.uid(), guild_id))
WITH CHECK (is_officer_of_guild(auth.uid(), guild_id));

-- Policy 4: Officers can DELETE members in their guild (using helper function to avoid recursion)
CREATE POLICY "Officers can delete members"
ON guild_members
FOR DELETE
TO authenticated
USING (is_officer_of_guild(auth.uid(), guild_id));

-- Grant execute on the helper function
GRANT EXECUTE ON FUNCTION is_officer_of_guild TO authenticated;
GRANT EXECUTE ON FUNCTION is_officer_of_guild TO anon;

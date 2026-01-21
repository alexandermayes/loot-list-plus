-- Fix RLS so users can view their own character's memberships
-- This is critical for the app to know what guilds a user is in

-- Create a function to check if a character belongs to the current user
-- Using SECURITY DEFINER to bypass RLS and prevent recursion
CREATE OR REPLACE FUNCTION character_belongs_to_user(p_character_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM characters
    WHERE id = p_character_id
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Drop any existing "own character" policy that might be broken
DROP POLICY IF EXISTS "Users can view own character memberships" ON character_guild_memberships;

-- Create policy that lets users see memberships for their own characters
-- This uses the security definer function to avoid recursion
CREATE POLICY "Users can view own character memberships" ON character_guild_memberships
  FOR SELECT
  USING (
    character_belongs_to_user(character_id)
  );

-- Verify the policies
SELECT policyname, cmd, permissive
FROM pg_policies
WHERE tablename = 'character_guild_memberships'
ORDER BY policyname;

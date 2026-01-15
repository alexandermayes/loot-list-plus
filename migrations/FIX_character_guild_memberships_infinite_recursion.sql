-- Fix infinite recursion in character_guild_memberships RLS policy
-- The "Guild members can view guild memberships" policy was querying the same table it protects

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Guild members can view guild memberships" ON character_guild_memberships;

-- Create a security definer function to check if user is in a guild
-- This bypasses RLS and prevents recursion
CREATE OR REPLACE FUNCTION user_is_in_guild(p_user_id UUID, p_guild_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM character_guild_memberships cgm
    INNER JOIN characters c ON c.id = cgm.character_id
    WHERE c.user_id = p_user_id
    AND cgm.guild_id = p_guild_id
    AND cgm.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create new policy using the security definer function
-- This avoids recursion by using a function that bypasses RLS
CREATE POLICY "Guild members can view guild memberships" ON character_guild_memberships
  FOR SELECT
  USING (
    user_is_in_guild(auth.uid(), guild_id)
  );

-- Also fix the "Officers can update guild memberships" policy which has same issue
DROP POLICY IF EXISTS "Officers can update guild memberships" ON character_guild_memberships;

-- Create security definer function to check if user is officer in guild
CREATE OR REPLACE FUNCTION user_is_officer_in_guild(p_user_id UUID, p_guild_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM character_guild_memberships cgm
    INNER JOIN characters c ON c.id = cgm.character_id
    WHERE c.user_id = p_user_id
    AND cgm.guild_id = p_guild_id
    AND cgm.role IN ('Officer', 'Guild Master')
    AND cgm.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE POLICY "Officers can update guild memberships" ON character_guild_memberships
  FOR UPDATE
  USING (
    user_is_officer_in_guild(auth.uid(), guild_id)
  );

-- Fix "Officers can delete guild memberships" policy
DROP POLICY IF EXISTS "Officers can delete guild memberships" ON character_guild_memberships;

CREATE POLICY "Officers can delete guild memberships" ON character_guild_memberships
  FOR DELETE
  USING (
    user_is_officer_in_guild(auth.uid(), guild_id)
  );

-- Verify policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'character_guild_memberships'
ORDER BY policyname;

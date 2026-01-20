-- =====================================================
-- FIX: Update guild_members RLS to use position-based permissions
-- =====================================================
-- Officers (position >= 50) can manage guild members
-- Fixes issue where custom role names prevent member management
-- =====================================================

BEGIN;

-- Drop old helper function that checks for hardcoded role name
DROP FUNCTION IF EXISTS is_officer_of_guild(UUID, UUID);

-- Create new helper function that checks position >= 50 (officer level)
CREATE OR REPLACE FUNCTION is_officer_of_guild(user_id_to_check UUID, guild_id_to_check UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM guild_members gm
    INNER JOIN guild_roles gr ON gr.guild_id = gm.guild_id AND gr.name = gm.role
    WHERE gm.user_id = user_id_to_check
      AND gm.guild_id = guild_id_to_check
      AND gm.is_active = true
      AND gr.position >= 50  -- Position-based: 50=Officer, 100=Guild Master
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

-- Policy 3: Officers can UPDATE members in their guild (using position-based check)
CREATE POLICY "Officers can update members"
ON guild_members
FOR UPDATE
TO authenticated
USING (is_officer_of_guild(auth.uid(), guild_id))
WITH CHECK (is_officer_of_guild(auth.uid(), guild_id));

-- Policy 4: Officers can DELETE members in their guild (using position-based check)
CREATE POLICY "Officers can delete members"
ON guild_members
FOR DELETE
TO authenticated
USING (is_officer_of_guild(auth.uid(), guild_id));

-- Grant execute on the helper function
GRANT EXECUTE ON FUNCTION is_officer_of_guild TO authenticated;
GRANT EXECUTE ON FUNCTION is_officer_of_guild TO anon;

COMMIT;

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Guild Members RLS Fixed!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Officers (position >= 50) can now:';
  RAISE NOTICE '- Update member roles';
  RAISE NOTICE '- Remove members from guild';
  RAISE NOTICE 'Works with custom role names!';
  RAISE NOTICE '========================================';
END $$;

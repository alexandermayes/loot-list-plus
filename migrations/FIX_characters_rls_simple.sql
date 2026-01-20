-- =====================================================
-- FIX: Simple non-recursive characters policy
-- =====================================================
-- Allow viewing characters that are in the same guild
-- Uses a security definer function to avoid recursion
-- =====================================================

BEGIN;

-- Drop the recursive policy
DROP POLICY IF EXISTS "Guild members can view guild characters" ON characters;

-- Create a security definer function to get user's guild IDs
-- This runs with definer permissions, bypassing RLS
CREATE OR REPLACE FUNCTION get_user_guild_ids(user_id UUID)
RETURNS TABLE(guild_id UUID)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT DISTINCT cgm.guild_id
  FROM character_guild_memberships cgm
  INNER JOIN characters c ON c.id = cgm.character_id
  WHERE c.user_id = user_id;
$$;

-- Add policy using the function (no recursion)
CREATE POLICY "Guild members can view guild characters" ON characters
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM character_guild_memberships cgm
      WHERE cgm.character_id = characters.id
      AND cgm.guild_id IN (SELECT guild_id FROM get_user_guild_ids(auth.uid()))
    )
  );

COMMIT;

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Characters RLS Fixed (Function Based)!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Guild members can now view other characters';
  RAISE NOTICE 'in their guild using a security definer function.';
  RAISE NOTICE 'Refresh browser to see character names.';
  RAISE NOTICE '========================================';
END $$;

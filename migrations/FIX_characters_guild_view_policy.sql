-- =====================================================
-- FIX: Characters RLS policy for guild member visibility
-- =====================================================
-- Ensure guild members can see each other's characters
-- =====================================================

BEGIN;

-- Drop existing policy if any
DROP POLICY IF EXISTS "Guild members can view guild characters" ON characters;

-- Create/replace the security definer function
CREATE OR REPLACE FUNCTION get_user_guild_ids(p_user_id UUID)
RETURNS TABLE(guild_id UUID)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT DISTINCT cgm.guild_id
  FROM character_guild_memberships cgm
  INNER JOIN characters c ON c.id = cgm.character_id
  WHERE c.user_id = p_user_id
  AND cgm.is_active = true;
$$;

-- Create the policy: view characters that are in same guild as current user
CREATE POLICY "Guild members can view guild characters" ON characters
  FOR SELECT
  USING (
    -- User can view their own characters
    user_id = auth.uid()
    OR
    -- User can view characters that are active members of their guilds
    EXISTS (
      SELECT 1
      FROM character_guild_memberships cgm
      WHERE cgm.character_id = characters.id
      AND cgm.is_active = true
      AND cgm.guild_id IN (SELECT guild_id FROM get_user_guild_ids(auth.uid()))
    )
  );

COMMIT;

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Characters Guild View Policy Applied!';
  RAISE NOTICE '========================================';
END $$;

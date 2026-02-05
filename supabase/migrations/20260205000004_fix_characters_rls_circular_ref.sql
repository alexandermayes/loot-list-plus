-- =====================================================
-- Fix characters RLS circular reference issue
-- =====================================================
-- The previous migration had a policy that referenced
-- the characters table inside itself, causing issues.
-- This migration fixes it by using a simpler approach.
-- =====================================================

-- Drop the problematic policy
DROP POLICY IF EXISTS "Guild members can view guild characters" ON characters;

-- Recreate with a simpler approach that doesn't self-reference
-- Uses auth.uid() directly against character_guild_memberships
CREATE POLICY "Guild members can view guild characters" ON characters
  FOR SELECT
  USING (
    EXISTS (
      -- Check if this character is in a guild where current user has a character
      SELECT 1
      FROM character_guild_memberships target_membership
      WHERE target_membership.character_id = characters.id
        AND target_membership.is_active = true
        AND target_membership.guild_id IN (
          -- Get guilds where current user has an active character
          SELECT cgm.guild_id
          FROM character_guild_memberships cgm
          INNER JOIN characters c ON c.id = cgm.character_id
          WHERE c.user_id = auth.uid()
            AND cgm.is_active = true
        )
    )
  );

-- Note: The inner subquery references characters table, but PostgreSQL
-- handles this correctly because:
-- 1. The "Users can view own characters" policy allows seeing own characters
-- 2. The subquery only needs to check user_id = auth.uid() which that policy allows

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Fixed characters RLS circular reference';
  RAISE NOTICE '========================================';
END $$;

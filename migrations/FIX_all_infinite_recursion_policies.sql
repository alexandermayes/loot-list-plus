-- Fix all infinite recursion issues in RLS policies
-- Remove policies that reference themselves

-- 1. Fix character_guild_memberships policies
DROP POLICY IF EXISTS "Guild members can view guild memberships" ON character_guild_memberships;

-- Keep only the simple policy that lets users view their own character memberships
-- This is sufficient - users can see memberships for their own characters

-- 2. Fix loot_submissions policies to remove character_guild_memberships reference
DROP POLICY IF EXISTS "Users can view submissions in their guild" ON loot_submissions;

-- Simplified policy: users can view submissions for their own characters
CREATE POLICY "Users can view own character submissions" ON loot_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = loot_submissions.character_id
      AND characters.user_id = auth.uid()
    )
  );

-- Officers can view all submissions in their guilds (without recursive reference)
CREATE POLICY "Officers can view guild submissions" ON loot_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM guild_members gm
      WHERE gm.guild_id = loot_submissions.guild_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('Officer', 'Guild Master')
    )
  );

-- Verify no recursion in policies
SELECT
  tablename,
  policyname
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('characters', 'character_guild_memberships', 'loot_submissions')
ORDER BY tablename, policyname;

-- =====================================================
-- Fix characters RLS to allow guild members to see
-- characters that are members of their guild
-- =====================================================
-- Problem: When viewing loot submissions, guild members
-- can't see other members' character names because RLS
-- on characters table only allows seeing own characters.
-- =====================================================

-- First, ensure RLS is enabled on characters
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

-- Drop existing select policy if any (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own characters" ON characters;
DROP POLICY IF EXISTS "Guild members can view guild characters" ON characters;
DROP POLICY IF EXISTS "characters_select" ON characters;

-- Policy 1: Users can always see their own characters
CREATE POLICY "Users can view own characters" ON characters
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy 2: Guild members can see characters that belong to their guild
-- This allows viewing character names in loot submissions, master sheet, etc.
CREATE POLICY "Guild members can view guild characters" ON characters
  FOR SELECT
  USING (
    EXISTS (
      -- Character must be in a guild that the current user is also a member of
      SELECT 1
      FROM character_guild_memberships target_cgm
      JOIN character_guild_memberships my_cgm ON my_cgm.guild_id = target_cgm.guild_id
      JOIN characters my_char ON my_char.id = my_cgm.character_id
      WHERE target_cgm.character_id = characters.id
        AND target_cgm.is_active = true
        AND my_cgm.is_active = true
        AND my_char.user_id = auth.uid()
    )
  );

-- Ensure insert/update/delete policies exist for users managing their own characters
DROP POLICY IF EXISTS "Users can insert own characters" ON characters;
DROP POLICY IF EXISTS "Users can update own characters" ON characters;
DROP POLICY IF EXISTS "Users can delete own characters" ON characters;

CREATE POLICY "Users can insert own characters" ON characters
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own characters" ON characters
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own characters" ON characters
  FOR DELETE
  USING (user_id = auth.uid());

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Characters RLS policies updated!';
  RAISE NOTICE '- Users can view/manage own characters';
  RAISE NOTICE '- Guild members can view guild characters';
  RAISE NOTICE '========================================';
END $$;

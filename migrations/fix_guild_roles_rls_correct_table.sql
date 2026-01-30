-- =====================================================
-- FIX: Guild Roles RLS - Use correct membership table
-- =====================================================
-- Previous migration used non-existent 'guild_members' table
-- This corrects it to use 'character_guild_memberships' with
-- a join through 'characters' to get the user_id
-- =====================================================

BEGIN;

-- Drop existing policies
DROP POLICY IF EXISTS "Guild members can view guild roles" ON guild_roles;
DROP POLICY IF EXISTS "Officers can create guild roles" ON guild_roles;
DROP POLICY IF EXISTS "Officers can update guild roles" ON guild_roles;
DROP POLICY IF EXISTS "Officers can delete guild roles" ON guild_roles;

-- Policy 1: Guild members can view roles in their guild
-- Join through characters to get user_id from memberships
CREATE POLICY "Guild members can view guild roles" ON guild_roles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM character_guild_memberships cgm
      INNER JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = guild_roles.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
    )
  );

-- Policy 2: Officers (position >= 50) can INSERT new roles
CREATE POLICY "Officers can create guild roles" ON guild_roles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM character_guild_memberships cgm
      INNER JOIN characters c ON c.id = cgm.character_id
      INNER JOIN guild_roles gr ON gr.guild_id = cgm.guild_id AND gr.name = cgm.role
      WHERE cgm.guild_id = guild_roles.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND gr.position >= 50
    )
  );

-- Policy 3: Officers (position >= 50) can UPDATE roles
CREATE POLICY "Officers can update guild roles" ON guild_roles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM character_guild_memberships cgm
      INNER JOIN characters c ON c.id = cgm.character_id
      INNER JOIN guild_roles gr ON gr.guild_id = cgm.guild_id AND gr.name = cgm.role
      WHERE cgm.guild_id = guild_roles.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND gr.position >= 50
    )
  );

-- Policy 4: Officers (position >= 50) can DELETE non-default roles
CREATE POLICY "Officers can delete guild roles" ON guild_roles
  FOR DELETE
  USING (
    is_default = false
    AND EXISTS (
      SELECT 1
      FROM character_guild_memberships cgm
      INNER JOIN characters c ON c.id = cgm.character_id
      INNER JOIN guild_roles gr ON gr.guild_id = cgm.guild_id AND gr.name = cgm.role
      WHERE cgm.guild_id = guild_roles.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND gr.position >= 50
    )
  );

COMMIT;

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Guild Roles RLS Fixed (Correct Table)!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Now using character_guild_memberships';
  RAISE NOTICE 'with proper join through characters';
  RAISE NOTICE '========================================';
END $$;
